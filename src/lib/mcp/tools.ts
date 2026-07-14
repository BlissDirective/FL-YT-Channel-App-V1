import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GATE_FOR_STATUS,
  GATE_LABELS,
  bracketById,
  DIRECTOR_LENGTH_BRACKETS,
} from "@studio/core";
import {
  decideGate,
  fullAutoGenerate,
  retryClips,
  runDirectedStage,
  runStageReview,
  regenerateScript,
} from "@/lib/pipeline/engine";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import { runIntelligence } from "@/lib/pipeline/intelligence";
import { recordOperatorDecision, directorStageForStatus } from "@/lib/pipeline/decisions";
import { DEMO_TOPICS } from "@/lib/pipeline/mock-content";
import { estimateRevenueUsd } from "@/lib/adapters/youtube";

/**
 * studio-mcp tool registry (Phase 9). Each tool exposes a slice of the studio
 * to an MCP client (Claude Code/Desktop/this environment) so the finished app
 * is operable by Claude itself. All handlers use the service-role client —
 * the endpoint is authenticated by a scoped token, not a user session.
 */

type Db = ReturnType<typeof createAdminClient>;
type Handler = (args: Record<string, unknown>, db: Db) => Promise<unknown>;
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: Handler;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function obj(props: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties: props, required };
}

// ── Director Mode guards (spec §8) ──────────────────────────────────────
/** Resolve a project's pipeline mode from a videoId or projectId. */
async function pipelineModeFor(
  db: Db,
  opts: { videoId?: string; projectId?: string },
): Promise<"director" | "autonomous"> {
  let projectId = opts.projectId;
  if (!projectId && opts.videoId) {
    const { data } = await db.from("videos").select("project_id").eq("id", opts.videoId).maybeSingle();
    projectId = (data as { project_id?: string } | null)?.project_id;
  }
  if (!projectId) return "autonomous";
  const { data } = await db.from("projects").select("pipeline_mode").eq("id", projectId).maybeSingle();
  return (data as { pipeline_mode?: string } | null)?.pipeline_mode === "director"
    ? "director"
    : "autonomous";
}

/** Autonomous mutating tools refuse on a director project. */
async function refuseIfDirector(db: Db, opts: { videoId?: string; projectId?: string }): Promise<void> {
  if ((await pipelineModeFor(db, opts)) === "director") {
    throw new Error(
      "This project is in Director Mode — autonomous tools are disabled. Use the director_* tools (or the app Console) to direct each stage.",
    );
  }
}

/** director_* tools apply only to a director project. */
async function requireDirector(db: Db, opts: { videoId?: string; projectId?: string }): Promise<void> {
  if ((await pipelineModeFor(db, opts)) !== "director") {
    throw new Error("director_* tools apply only to Director-Mode projects.");
  }
}

export const TOOLS: Tool[] = [
  {
    name: "list_projects",
    description: "List all channel projects with niche, status, and video counts.",
    inputSchema: obj({}),
    handler: async (_a, db) => {
      const { data: projects } = await db
        .from("projects")
        .select("id, name, niche, status, rpm_usd")
        .order("created_at", { ascending: true });
      const { data: videos } = await db.from("videos").select("project_id, status");
      const counts = new Map<string, { total: number; tracking: number; inPipeline: number }>();
      for (const v of videos ?? []) {
        const c = counts.get(v.project_id) ?? { total: 0, tracking: 0, inPipeline: 0 };
        c.total += 1;
        if (v.status === "TRACKING") c.tracking += 1;
        if (!["TRACKING", "APPROVED", "KILLED"].includes(v.status)) c.inPipeline += 1;
        counts.set(v.project_id, c);
      }
      return (projects ?? []).map((p) => ({ ...p, videos: counts.get(p.id) ?? { total: 0, tracking: 0, inPipeline: 0 } }));
    },
  },
  {
    name: "get_project_stats",
    description: "Tracked-video stats (views, likes, est. revenue) and pipeline counts for one project.",
    inputSchema: obj({ projectId: { type: "string" } }, ["projectId"]),
    handler: async (a, db) => {
      const projectId = str(a.projectId);
      const { data: project } = await db
        .from("projects")
        .select("id, name, rpm_usd")
        .eq("id", projectId)
        .maybeSingle();
      if (!project) return { error: "project not found" };
      const { data: videos } = await db
        .from("videos")
        .select("id, title, status, youtube_video_id")
        .eq("project_id", projectId);
      const tracked = (videos ?? []).filter((v) => v.youtube_video_id);
      const { data: snaps } = tracked.length
        ? await db
            .from("analytics_snapshots")
            .select("video_id, views, likes, comments, captured_at")
            .in("video_id", tracked.map((v) => v.id))
            .order("captured_at", { ascending: false })
        : { data: [] };
      const latest = new Map<string, { views: number; likes: number; comments: number }>();
      for (const s of snaps ?? []) if (!latest.has(s.video_id)) latest.set(s.video_id, s);
      const rpm = Number(project.rpm_usd ?? 2);
      let views = 0, likes = 0, revenue = 0;
      for (const v of tracked) {
        const s = latest.get(v.id);
        if (!s) continue;
        views += s.views; likes += s.likes; revenue += estimateRevenueUsd(s.views, rpm);
      }
      return {
        project: project.name,
        videos: (videos ?? []).length,
        tracking: tracked.length,
        totalViews: views,
        totalLikes: likes,
        estRevenueUsd: Math.round(revenue * 100) / 100,
      };
    },
  },
  {
    name: "list_pending_approvals",
    description: "Videos waiting at a review gate, with the gate, QC score, and title. Optional projectId filter.",
    inputSchema: obj({ projectId: { type: "string", description: "Optional — scope to one project." } }),
    handler: async (a, db) => {
      let q = db.from("videos").select("id, project_id, title, status").order("updated_at", { ascending: false });
      if (str(a.projectId)) q = q.eq("project_id", str(a.projectId));
      const { data: videos } = await q;
      const pending = (videos ?? []).filter((v) => GATE_FOR_STATUS[v.status as keyof typeof GATE_FOR_STATUS]);
      if (pending.length === 0) return [];
      const { data: qc } = await db
        .from("qc_reviews")
        .select("video_id, gate, score")
        .in("video_id", pending.map((v) => v.id))
        .order("created_at", { ascending: false });
      const qcByKey = new Map<string, number>();
      for (const r of qc ?? []) {
        const k = `${r.video_id}:${r.gate}`;
        if (!qcByKey.has(k)) qcByKey.set(k, Number(r.score));
      }
      return pending.map((v) => {
        const gate = GATE_FOR_STATUS[v.status as keyof typeof GATE_FOR_STATUS]!;
        return {
          videoId: v.id,
          projectId: v.project_id,
          title: v.title,
          gate: GATE_LABELS[gate],
          qcScore: qcByKey.get(`${v.id}:${gate}`) ?? null,
        };
      });
    },
  },
  {
    name: "approve_gate",
    description: "Approve the open review gate for a video, advancing the pipeline.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      await refuseIfDirector(db, { videoId: str(a.videoId) });
      const r = await decideGate({ videoId: str(a.videoId), decision: "approved" }, db as never, "mcp");
      return { ok: r.ok, error: r.error };
    },
  },
  {
    name: "request_revision",
    description: "Send the open gate back for revision with notes; the prior stage re-runs with your notes.",
    inputSchema: obj({ videoId: { type: "string" }, notes: { type: "string" } }, ["videoId", "notes"]),
    handler: async (a, db) => {
      await refuseIfDirector(db, { videoId: str(a.videoId) });
      const notes = str(a.notes).trim();
      if (!notes) return { ok: false, error: "notes required" };
      const r = await decideGate({ videoId: str(a.videoId), decision: "revision", notes }, db as never, "mcp");
      return { ok: r.ok, error: r.error };
    },
  },
  {
    name: "queue_idea",
    description: "Queue a new idea as an idea-stage video in the review queue.",
    inputSchema: obj(
      { projectId: { type: "string" }, title: { type: "string" }, topic: { type: "string" } },
      ["projectId", "title"],
    ),
    handler: async (a, db) => {
      await refuseIfDirector(db, { projectId: str(a.projectId) });
      const title = str(a.title).trim();
      if (!title) return { ok: false, error: "title required" };
      const { data: idea } = await db
        .from("ideas")
        .insert({ project_id: str(a.projectId), title, angle: "", status: "new", flag: "MEDIUM", source: { origin: "mcp" } })
        .select("id")
        .single();
      const { data: video } = await db
        .from("videos")
        .insert({ project_id: str(a.projectId), idea_id: idea?.id ?? null, title, topic: str(a.topic) || title, status: "IDEA" })
        .select("id")
        .single();
      return { ok: true, videoId: video?.id };
    },
  },
  {
    name: "update_project",
    description:
      "Update a project's settings: niche, audience, angle, tone, niche RPM, per-video/monthly budgets, and brand kit (primary/secondary colors, thumbnail style, font). Only provided fields change.",
    inputSchema: obj(
      {
        projectId: { type: "string" },
        niche: { type: "string" },
        audience: { type: "string" },
        angle: { type: "string" },
        tone: { type: "string" },
        rpmUsd: { type: "number", description: "Niche RPM (USD per 1,000 views)." },
        perVideoBudgetUsd: { type: "number" },
        monthlyBudgetUsd: { type: "number" },
        brandPrimary: { type: "string", description: "Brand primary color (hex) — captions, CTA, thumbnail accent." },
        brandSecondary: { type: "string", description: "Brand secondary color (hex) — intro/end gradient base." },
        thumbnailStyle: { type: "string", description: "Thumbnail aesthetic phrase fed to the image model." },
        brandFont: { type: "string", description: "Brand font key (e.g. bold-sans)." },
        autonomy: {
          type: "object",
          description: "Per-gate autonomy, e.g. {\"SCRIPT\":\"assist\"}. Keys IDEA|SCRIPT|ASSETS|FINAL, values assist|copilot|autopilot.",
        },
      },
      ["projectId"],
    ),
    handler: async (a, db) => {
      const id = str(a.projectId);
      const { data: project } = await db
        .from("projects")
        .select("budget, brand_kit, autonomy")
        .eq("id", id)
        .maybeSingle();
      if (!project) return { ok: false, error: "project not found" };

      const patch: Record<string, unknown> = {};
      if (typeof a.niche === "string") patch.niche = a.niche;
      if (typeof a.audience === "string") patch.audience = a.audience;
      if (typeof a.angle === "string") patch.angle = a.angle;
      if (typeof a.tone === "string") patch.tone = a.tone;
      if (typeof a.rpmUsd === "number") patch.rpm_usd = a.rpmUsd;

      const budget = (project.budget ?? {}) as { perVideoUsd?: number; monthlyUsd?: number };
      if (typeof a.perVideoBudgetUsd === "number") budget.perVideoUsd = a.perVideoBudgetUsd;
      if (typeof a.monthlyBudgetUsd === "number") budget.monthlyUsd = a.monthlyBudgetUsd;
      if (typeof a.perVideoBudgetUsd === "number" || typeof a.monthlyBudgetUsd === "number") {
        patch.budget = budget;
      }

      const brand = (project.brand_kit ?? {}) as Record<string, unknown>;
      let brandTouched = false;
      if (typeof a.brandPrimary === "string") { brand.primary = a.brandPrimary; brandTouched = true; }
      if (typeof a.brandSecondary === "string") { brand.secondary = a.brandSecondary; brandTouched = true; }
      if (typeof a.thumbnailStyle === "string") { brand.thumbnailStyle = a.thumbnailStyle; brandTouched = true; }
      if (typeof a.brandFont === "string") { brand.font = a.brandFont; brandTouched = true; }
      if (brandTouched) patch.brand_kit = brand;

      if (a.autonomy && typeof a.autonomy === "object" && !Array.isArray(a.autonomy)) {
        patch.autonomy = {
          ...((project.autonomy ?? {}) as Record<string, unknown>),
          ...(a.autonomy as Record<string, unknown>),
        };
      }

      if (Object.keys(patch).length === 0) return { ok: false, error: "no fields to update" };
      const { error } = await db.from("projects").update(patch).eq("id", id);
      return error ? { ok: false, error: error.message } : { ok: true, updated: Object.keys(patch) };
    },
  },
  {
    name: "get_video",
    description: "Full detail for one video: status, latest script metadata, asset counts, latest stats.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      const [{ data: video }, { data: script }, { data: assets }, { data: snap }] = await Promise.all([
        db.from("videos").select("*").eq("id", videoId).maybeSingle(),
        db.from("scripts").select("version, runtime_sec, metadata").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle(),
        db.from("assets").select("kind").eq("video_id", videoId),
        db.from("analytics_snapshots").select("views, likes, comments, captured_at").eq("video_id", videoId).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!video) return { error: "video not found" };
      const assetCounts: Record<string, number> = {};
      for (const x of assets ?? []) assetCounts[x.kind] = (assetCounts[x.kind] ?? 0) + 1;
      return {
        id: video.id,
        title: video.title,
        status: video.status,
        format: video.format,
        youtubeVideoId: video.youtube_video_id,
        costUsd: Number(video.total_cost_usd),
        script: script ? { version: script.version, runtimeSec: script.runtime_sec, titles: (script.metadata as { titles?: string[] })?.titles } : null,
        assets: assetCounts,
        latestStats: snap ?? null,
      };
    },
  },
  {
    name: "run_intelligence_now",
    description: "Run the daily intelligence pass for a project now — scouts the niche and lands scored idea cards.",
    inputSchema: obj({ projectId: { type: "string" } }, ["projectId"]),
    handler: async (a) => {
      const { created } = await runIntelligence(str(a.projectId));
      return { ok: true, created };
    },
  },
  {
    name: "get_cost_summary",
    description: "Spend summary: this month and all-time, portfolio-wide or for one project.",
    inputSchema: obj({ projectId: { type: "string", description: "Optional — scope to one project." } }),
    handler: async (a, db) => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      let all = db.from("cost_ledger").select("usd, at, project_id");
      if (str(a.projectId)) all = all.eq("project_id", str(a.projectId));
      const { data } = await all;
      const total = (data ?? []).reduce((s, r) => s + Number(r.usd), 0);
      const month = (data ?? []).filter((r) => r.at >= monthStart).reduce((s, r) => s + Number(r.usd), 0);
      return { monthUsd: Math.round(month * 100) / 100, totalUsd: Math.round(total * 100) / 100, entries: (data ?? []).length };
    },
  },
  {
    name: "propose_template_update",
    description: "Propose a prompt-template revision as an insight card the operator applies with one tap (versioned, revertible).",
    inputSchema: obj(
      {
        projectId: { type: "string" },
        kind: { type: "string", description: "script | scoring | thumbnail | metadata" },
        body: { type: "string", description: "The full revised template body." },
        rationale: { type: "string", description: "Why this change — shown on the insight card." },
      },
      ["projectId", "kind", "body"],
    ),
    handler: async (a, db) => {
      const body = str(a.body).trim();
      if (!body) return { ok: false, error: "body required" };
      const { data } = await db
        .from("insights")
        .insert({
          project_id: str(a.projectId),
          kind: "scout",
          title: `Proposed ${str(a.kind) || "script"} template update`,
          body: str(a.rationale) || "Template revision proposed via MCP.",
          evidence: { origin: "mcp" },
          proposed_template_kind: str(a.kind) || "script",
          proposed_template_body: body,
        })
        .select("id")
        .single();
      return { ok: true, insightId: data?.id };
    },
  },
  {
    name: "full_auto_generate",
    description:
      "Run Full Auto-Generate on a SCRIPT_READY video: classify shot types, approve the script (VO + free stock + keyframes), enqueue a budget-capped smart mix of clip jobs, and auto-finish to render (pauses at Final review). tier = base | economy | premium | platinum (default base — free equivalent, no AI video; the custom tier is configured in the app, not here). The per-video budget and AI-clip cap are taken from the project.",
    inputSchema: obj(
      {
        videoId: { type: "string", description: "Video at the Script gate (SCRIPT_READY)." },
        tier: { type: "string", description: "base | economy | premium | platinum | director (default base)." },
      },
      ["videoId"],
    ),
    handler: async (a, db) => {
      await refuseIfDirector(db, { videoId: str(a.videoId) });
      const tier = (["base", "economy", "premium", "platinum", "director"].includes(str(a.tier)) ? str(a.tier) : "base") as AutoTier;
      return fullAutoGenerate({ videoId: str(a.videoId), tier }, db as never);
    },
  },
  {
    name: "retry_clips",
    description:
      "Retry a video's failed clip jobs after a provider outage (e.g. fal balance topped up). Re-renders any keyframe that degraded to a placeholder, then requeues the errored clip jobs for the worker. Voiceover and existing real assets are kept.",
    inputSchema: obj(
      { videoId: { type: "string", description: "Video whose clip jobs errored." } },
      ["videoId"],
    ),
    handler: async (a, db) => retryClips({ videoId: str(a.videoId) }, db as never),
  },

  // ── Director Mode tools (spec §8) — mirror the console buttons. Each is one
  //    bounded action; money rails enforced server-side; every call logs an
  //    operator_decisions row. director_* tools refuse on autonomous projects.
  {
    name: "director_generate_ideas",
    description:
      "Director Mode: generate N ideas (1–5) as IDEA-stage videos with a length bracket, awaiting direction. bracket = one of the DIRECTOR length brackets (e.g. 60-90s, 3-4min). Optional topic seed.",
    inputSchema: obj(
      {
        projectId: { type: "string" },
        count: { type: "number", description: "1–5 (default 1)." },
        format: { type: "string", description: "short | long (default long)." },
        bracket: { type: "string", description: "Length bracket id, e.g. 3-4min." },
        topic: { type: "string", description: "Optional topic seed." },
      },
      ["projectId"],
    ),
    handler: async (a, db) => {
      const projectId = str(a.projectId);
      await requireDirector(db, { projectId });
      const format = str(a.format) === "short" ? "short" : "long";
      const count = Math.max(1, Math.min(5, Math.round(Number(a.count) || 1)));
      const b = bracketById(str(a.bracket)) ?? DIRECTOR_LENGTH_BRACKETS.find((x) => x.format === format)!;
      const targetSec = Math.round((b.minSec + b.maxSec) / 2);
      let created = 0;
      for (let i = 0; i < count; i++) {
        const topic = str(a.topic).trim() || DEMO_TOPICS[(created + i) % DEMO_TOPICS.length].topic;
        const title = str(a.topic).trim()
          ? count > 1 ? `${str(a.topic).trim()} (${i + 1})` : str(a.topic).trim()
          : DEMO_TOPICS[(created + i) % DEMO_TOPICS.length].title;
        const { data: v } = await db
          .from("videos")
          .insert({
            project_id: projectId,
            title,
            topic,
            status: "IDEA",
            kind: format,
            target_length_sec: targetSec,
            length_target: { format: b.format, bracket: b.id, minSec: b.minSec, maxSec: b.maxSec },
          })
          .select("id")
          .single();
        if (v) {
          created++;
          await recordOperatorDecision(db, { projectId, videoId: (v as { id: string }).id, stage: "idea", action: "generate" });
        }
      }
      return { ok: created > 0, created };
    },
  },
  {
    name: "director_run_stage",
    description: "Director Mode: run the current stage's generation (script/visuals/render) for a video — one stage, then stop.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      await requireDirector(db, { videoId });
      const { data: v } = await db.from("videos").select("status, project_id").eq("id", videoId).maybeSingle();
      const r = await runDirectedStage(videoId, db as never);
      await recordOperatorDecision(db, {
        projectId: (v as { project_id?: string } | null)?.project_id ?? "",
        videoId,
        stage: directorStageForStatus((v as { status?: string } | null)?.status as never),
        action: "generate",
      });
      return { ok: r.ok, error: r.error };
    },
  },
  {
    name: "director_run_review",
    description: "Director Mode: run the advisory QC review for a video's current stage. Records a score; never advances or holds.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      await requireDirector(db, { videoId });
      const { data: v } = await db.from("videos").select("status, project_id").eq("id", videoId).maybeSingle();
      const r = await runStageReview(videoId, db as never);
      await recordOperatorDecision(db, {
        projectId: (v as { project_id?: string } | null)?.project_id ?? "",
        videoId,
        stage: directorStageForStatus((v as { status?: string } | null)?.status as never),
        action: "review",
        agentScore: r.score,
        agentVerdict: r.verdict,
        costUsd: r.costUsd,
      });
      return { ok: r.ok, error: r.error, score: r.score, verdict: r.verdict };
    },
  },
  {
    name: "director_advance",
    description: "Director Mode: advance a video one gate (no chaining). Money rails still apply.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      await requireDirector(db, { videoId });
      const { data: v } = await db.from("videos").select("status, project_id").eq("id", videoId).maybeSingle();
      const stage = directorStageForStatus((v as { status?: string } | null)?.status as never);
      const r = await decideGate({ videoId, decision: "approved" }, db as never, "mcp");
      await recordOperatorDecision(db, { projectId: (v as { project_id?: string } | null)?.project_id ?? "", videoId, stage, action: "advance" });
      return { ok: r.ok, error: r.error };
    },
  },
  {
    name: "director_revise",
    description: "Director Mode: revise the current stage applying notes (loops back + regenerates the stage). No revision caps.",
    inputSchema: obj({ videoId: { type: "string" }, notes: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      await requireDirector(db, { videoId });
      const { data: v } = await db.from("videos").select("status, project_id").eq("id", videoId).maybeSingle();
      const stage = directorStageForStatus((v as { status?: string } | null)?.status as never);
      const notes = str(a.notes).trim() || "Apply the review findings.";
      const back = await decideGate({ videoId, decision: "revision", notes }, db as never, "mcp");
      if (!back.ok) return { ok: false, error: back.error };
      if (stage !== "idea") await runDirectedStage(videoId, db as never);
      await recordOperatorDecision(db, { projectId: (v as { project_id?: string } | null)?.project_id ?? "", videoId, stage, action: "revise", operatorNotes: notes });
      return { ok: true };
    },
  },
  {
    name: "director_rerender",
    description: "Director Mode: re-render the current stage from scratch (fresh artifact). Script stage regenerates wholesale.",
    inputSchema: obj({ videoId: { type: "string" } }, ["videoId"]),
    handler: async (a, db) => {
      const videoId = str(a.videoId);
      await requireDirector(db, { videoId });
      const { data: v } = await db.from("videos").select("status, project_id").eq("id", videoId).maybeSingle();
      const stage = directorStageForStatus((v as { status?: string } | null)?.status as never);
      if (stage === "script") {
        const r = await regenerateScript({ videoId });
        if (!r.ok) return { ok: false, error: r.error };
      } else {
        const back = await decideGate({ videoId, decision: "revision", notes: "" }, db as never, "mcp");
        if (!back.ok) return { ok: false, error: back.error };
        if (stage !== "idea") await runDirectedStage(videoId, db as never);
      }
      await recordOperatorDecision(db, { projectId: (v as { project_id?: string } | null)?.project_id ?? "", videoId, stage, action: "rerender" });
      return { ok: true };
    },
  },
];

/** Token scope: `control` (STUDIO_MCP_TOKEN) may call everything; `read`
    (STUDIO_MCP_READ_TOKEN) is limited to inspection tools. One leaked
    read token must not equal silent control of publishing and spend. */
export type McpScope = "read" | "control";

const MUTATING_TOOLS = new Set([
  "approve_gate",
  "request_revision",
  "queue_idea",
  "update_project",
  "run_intelligence_now",
  "propose_template_update",
  "full_auto_generate",
  "retry_clips",
  "director_generate_ideas",
  "director_run_stage",
  "director_run_review",
  "director_advance",
  "director_revise",
  "director_rerender",
]);

export function toolMutates(name: string): boolean {
  return MUTATING_TOOLS.has(name);
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
  scope: McpScope = "control",
): Promise<unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  if (scope === "read" && toolMutates(name)) {
    throw new Error(`Tool ${name} requires the control token (read-only scope).`);
  }
  const db = createAdminClient();
  const out = await tool.handler(args ?? {}, db);
  if (toolMutates(name)) {
    // Best-effort audit trail of every remote mutation — who (token scope),
    // what, and with which arguments. Never fails the call itself.
    try {
      await db.from("audit_log").insert({
        actor: `mcp:${scope}`,
        action: name,
        payload: args ?? {},
      });
    } catch (err) {
      console.error("mcp audit log failed:", err);
    }
  }
  return out;
}
