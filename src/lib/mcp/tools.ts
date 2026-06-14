import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { GATE_FOR_STATUS, GATE_LABELS } from "@studio/core";
import { decideGate } from "@/lib/pipeline/engine";
import { runIntelligence } from "@/lib/pipeline/intelligence";
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
      const r = await decideGate({ videoId: str(a.videoId), decision: "approved" }, db as never, "mcp");
      return { ok: r.ok, error: r.error };
    },
  },
  {
    name: "request_revision",
    description: "Send the open gate back for revision with notes; the prior stage re-runs with your notes.",
    inputSchema: obj({ videoId: { type: "string" }, notes: { type: "string" } }, ["videoId", "notes"]),
    handler: async (a, db) => {
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
      "Update a project's settings: niche, audience, angle, tone, niche RPM, and per-video/monthly budgets. Only provided fields change.",
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
      },
      ["projectId"],
    ),
    handler: async (a, db) => {
      const id = str(a.projectId);
      const { data: project } = await db
        .from("projects")
        .select("budget")
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
];

export async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  const db = createAdminClient();
  return tool.handler(args ?? {}, db);
}
