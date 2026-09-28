import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { HF_USD_PER_SEC, parseDirectedScript, type DirectedScript } from "@studio/core";
import type { createAdminClient } from "@/lib/supabase/admin";
import { directedMedia, estimateDirected, loadDirected } from "@/lib/pipeline/directed";

/**
 * Channel bot operators (docs/bots/README.md). A bot is a Grok agent that
 * drives studio-mcp with its own bearer token. Everything a bot may do is
 * enforced HERE, server-side — its prompt is guidance, these are the rails:
 *   - only its own project (projectId injected, every videoId checked)
 *   - a tool allowlist (no publishing, no gate approvals, no voice saves)
 *   - a monthly Higgsfield cap (start of production and each revision
 *     must fit what is left)
 *   - one video in flight at a time, and a lesson + research note on its
 *     previous video before it may import the next (produce → learn → improve)
 */

type Db = ReturnType<typeof createAdminClient>;

export type BotContext = { id: string; name: string; projectId: string; monthlyCapUsd: number };

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newBotToken = () => `fsbot_${randomBytes(24).toString("base64url")}`;

/** Resolve an active bot from its bearer token (null = not a bot token). */
export async function resolveBot(db: Db, token: string | undefined): Promise<BotContext | null> {
  if (!token || !token.startsWith("fsbot_")) return null;
  const { data } = await db
    .from("bot_agents")
    .select("id, name, project_id, monthly_cap_usd, active")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || !data.active) return null;
  await db.from("bot_agents").update({ last_seen_at: new Date().toISOString() }).eq("id", data.id);
  return { id: data.id, name: data.name, projectId: data.project_id, monthlyCapUsd: Number(data.monthly_cap_usd) };
}

/** Tools a bot may call. Anything else is refused. */
export const BOT_TOOLS = new Set([
  // read
  "get_bot_brief",
  "get_budget_status",
  "list_my_videos",
  "get_video",
  "get_video_media",
  "get_qc_pack",
  "list_lessons",
  "estimate_directed",
  // write (each gated below)
  "import_script",
  "produce_directed",
  "revise_sections",
  "stage_directed_cut",
  "retry_clips",
  "make_reference_still",
  "design_voice",
  "add_lesson",
  "record_research",
]);

const IN_FLIGHT = ["SCRIPT_READY", "GENERATING_ASSETS", "ASSETS_READY", "ASSEMBLING"];
const HF_PROVIDERS = ["higgsfield", "higgsfield-video"];

/** Month-to-date Higgsfield spend (stills + video) for a project. */
export async function monthHiggsfieldSpend(db: Db, projectId: string): Promise<number> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const { data } = await db
      .from("cost_ledger")
      .select("usd")
      .eq("project_id", projectId)
      .in("provider", HF_PROVIDERS)
      .gte("at", monthStart)
      .order("id")
      .range(from, from + 999);
    total += (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
    if (!data || data.length < 1000) return Math.round(total * 100) / 100;
  }
}

export async function budgetStatus(db: Db, bot: BotContext) {
  const spent = await monthHiggsfieldSpend(db, bot.projectId);
  return { monthlyCapUsd: bot.monthlyCapUsd, spentThisMonthUsd: spent, remainingUsd: Math.round((bot.monthlyCapUsd - spent) * 100) / 100 };
}

async function videoProject(db: Db, videoId: string): Promise<{ project_id: string; status: string; bot_agent_id: string | null } | null> {
  const { data } = await db.from("videos").select("project_id, status, bot_agent_id").eq("id", videoId).maybeSingle();
  return (data as { project_id: string; status: string; bot_agent_id: string | null } | null) ?? null;
}

/**
 * Enforce a bot's rails before a tool runs. Mutates `args` (injects the bot's
 * projectId). Throws a plain-language refusal the bot can act on.
 */
export async function enforceBot(db: Db, bot: BotContext, tool: string, args: Record<string, unknown>): Promise<void> {
  if (!BOT_TOOLS.has(tool)) throw new Error(`${tool} is not available to channel bots (allowed: ${[...BOT_TOOLS].join(", ")}).`);

  if ("projectId" in args && args.projectId && args.projectId !== bot.projectId) {
    throw new Error("A bot may only act on its own channel.");
  }
  args.projectId = bot.projectId;

  const videoId = typeof args.videoId === "string" ? args.videoId : "";
  if (videoId) {
    const v = await videoProject(db, videoId);
    if (!v || v.project_id !== bot.projectId) throw new Error("That video is not in your channel.");
  }

  const budget = await budgetStatus(db, bot);

  if (tool === "import_script") {
    const { data: flight } = await db
      .from("videos")
      .select("id, title, status")
      .eq("project_id", bot.projectId)
      .eq("directed", true)
      .in("status", IN_FLIGHT);
    if ((flight ?? []).length) {
      const f = flight![0];
      throw new Error(`One video at a time: "${f.title}" (${f.id}) is still ${f.status}. Finish it to Final review, QC it and log lessons first.`);
    }
    // Learn before the next one: the bot's most recent finished video must
    // carry at least one lesson AND one research note.
    const { data: last } = await db
      .from("videos")
      .select("id, title")
      .eq("bot_agent_id", bot.id)
      .in("status", ["FINAL_REVIEW", "APPROVED", "TRACKING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      const [{ count: lessons }, { count: research }] = await Promise.all([
        db.from("bot_lessons").select("id", { count: "exact", head: true }).eq("video_id", last.id),
        db.from("bot_research").select("id", { count: "exact", head: true }).eq("video_id", last.id),
      ]);
      if (!lessons || !research) {
        throw new Error(`Learn before the next video: log at least one add_lesson and one record_research for "${last.title}" (${last.id}) first.`);
      }
    }
  }

  if (tool === "produce_directed" && videoId) {
    const loaded = await loadDirected(db, videoId);
    if ("error" in loaded) throw new Error(loaded.error);
    if (loaded.video.status === "SCRIPT_READY") {
      const e = estimateDirected(loaded.script);
      const need = e.videoUsd + e.stillsUsd;
      if (need > budget.remainingUsd) {
        throw new Error(`Over budget: this video needs ~$${need.toFixed(2)} of Higgsfield, $${budget.remainingUsd.toFixed(2)} is left of your $${bot.monthlyCapUsd} monthly cap. Shorten it, use 480p, or wait for the director.`);
      }
    }
  }

  if (tool === "revise_sections" && videoId) {
    const loaded = await loadDirected(db, videoId);
    if ("error" in loaded) throw new Error(loaded.error);
    const rate = HF_USD_PER_SEC[loaded.script.resolution ?? "720p"];
    const idxs = new Set((Array.isArray(args.sections) ? args.sections : []).map((s) => Number((s as { idx?: number }).idx)));
    const need = loaded.script.sections.filter((s) => idxs.has(s.idx)).reduce((n, s) => n + s.sec * rate, 0);
    if (need > budget.remainingUsd) {
      throw new Error(`Over budget: this revision needs ~$${need.toFixed(2)}, $${budget.remainingUsd.toFixed(2)} is left this month.`);
    }
  }

  if ((tool === "make_reference_still" || tool === "design_voice") && budget.remainingUsd <= 0.5) {
    throw new Error("Monthly cap reached — no new generations until next month or a director raise.");
  }
}

/** After a bot's import succeeds, stamp the video with the bot. */
export async function stampBotVideo(db: Db, bot: BotContext, videoId: string) {
  await db.from("videos").update({ bot_agent_id: bot.id }).eq("id", videoId);
}

// ── Playbooks, lessons, research ────────────────────────────────────────

export async function upsertPlaybook(db: Db, opts: { key: string; projectId: string | null; content: string; by?: string }) {
  let q = db.from("bot_playbooks").select("id, version").eq("key", opts.key);
  q = opts.projectId ? q.eq("project_id", opts.projectId) : q.is("project_id", null);
  const { data: existing } = await q.maybeSingle();
  if (existing) {
    const { error } = await db
      .from("bot_playbooks")
      .update({ content: opts.content, version: Number(existing.version) + 1, updated_at: new Date().toISOString(), updated_by: opts.by ?? "director" })
      .eq("id", existing.id);
    return error ? { ok: false, error: error.message } : { ok: true, version: Number(existing.version) + 1 };
  }
  const { error } = await db.from("bot_playbooks").insert({ key: opts.key, project_id: opts.projectId, content: opts.content, updated_by: opts.by ?? "director" });
  return error ? { ok: false, error: error.message } : { ok: true, version: 1 };
}

/** Everything a bot must read before creating its next video. */
export async function botBrief(db: Db, bot: BotContext) {
  const [{ data: project }, { data: books }, { data: adopted }, { data: proposed }, { data: research }, { data: videos }, budget] = await Promise.all([
    db.from("projects").select("id, name, niche, brand_kit").eq("id", bot.projectId).maybeSingle(),
    db.from("bot_playbooks").select("key, project_id, content, version, updated_at").or(`project_id.is.null,project_id.eq.${bot.projectId}`),
    db.from("bot_lessons").select("id, kind, lesson, evidence, author, created_at").eq("project_id", bot.projectId).eq("status", "adopted").order("created_at", { ascending: true }),
    db.from("bot_lessons").select("id, kind, lesson, created_at").eq("project_id", bot.projectId).eq("status", "proposed").order("created_at", { ascending: false }).limit(20),
    db.from("bot_research").select("query, findings, sources, created_at").eq("project_id", bot.projectId).order("created_at", { ascending: false }).limit(8),
    db.from("videos").select("id, title, kind, status, total_cost_usd, paused_reason, created_at").eq("project_id", bot.projectId).eq("directed", true).order("created_at", { ascending: false }).limit(30),
    budgetStatus(db, bot),
  ]);
  const book = (key: string, scoped: boolean) =>
    (books ?? []).find((b) => b.key === key && (scoped ? b.project_id === bot.projectId : b.project_id === null));
  const brand = (project?.brand_kit ?? {}) as { voiceCast?: Record<string, string> };
  return {
    you: { bot: bot.name, channel: project?.name, projectId: bot.projectId, niche: project?.niche },
    budget,
    voices: Object.keys(brand.voiceCast ?? {}),
    operatingRules: book("operating-rules", false)?.content ?? "(missing — stop and ask the director)",
    lessonsLearned: book("lessons-learned", false)?.content ?? "",
    channelPlaybook: book("playbook", true)?.content ?? "(missing — stop and ask the director)",
    directorNotes: book("director-notes", true)?.content ?? "",
    adoptedLessons: adopted ?? [],
    pendingLessons: proposed ?? [],
    recentResearch: research ?? [],
    videos: videos ?? [],
  };
}

export async function addLesson(db: Db, opts: { projectId: string; videoId?: string; kind?: string; lesson: string; evidence?: string; author?: "bot" | "director" }) {
  if (!opts.lesson.trim()) return { ok: false, error: "lesson is empty" };
  const author = opts.author ?? "bot";
  const { data, error } = await db
    .from("bot_lessons")
    .insert({
      project_id: opts.projectId,
      video_id: opts.videoId || null,
      kind: opts.kind || "quality",
      lesson: opts.lesson.trim(),
      evidence: opts.evidence?.trim() || null,
      author,
      // Director guidance is adopted on write; bot lessons wait for review.
      status: author === "director" ? "adopted" : "proposed",
    })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function recordResearch(db: Db, opts: { projectId: string; videoId?: string; query: string; findings: string; sources?: unknown }) {
  if (!opts.query.trim() || !opts.findings.trim()) return { ok: false, error: "query and findings are required" };
  const sources = Array.isArray(opts.sources) ? opts.sources : [];
  if (!sources.length) return { ok: false, error: "cite at least one source (URL) — unsourced research is not accepted" };
  const { data, error } = await db
    .from("bot_research")
    .insert({ project_id: opts.projectId, video_id: opts.videoId || null, query: opts.query.trim(), findings: opts.findings.trim(), sources })
    .select("id")
    .single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function listLessons(db: Db, opts: { projectId?: string; status?: string; limit?: number }) {
  let q = db.from("bot_lessons").select("id, project_id, video_id, author, kind, lesson, evidence, status, review_note, created_at").order("created_at", { ascending: false }).limit(Math.min(200, opts.limit ?? 50));
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data } = await q;
  return data ?? [];
}

/** Director: adopt / retire bot lessons (with a note the bot will see). */
export async function reviewLessons(db: Db, opts: { ids: string[]; status: "adopted" | "retired"; note?: string }) {
  if (!opts.ids.length) return { ok: false, error: "no ids" };
  const { error } = await db
    .from("bot_lessons")
    .update({ status: opts.status, review_note: opts.note ?? null, reviewed_at: new Date().toISOString() })
    .in("id", opts.ids);
  return error ? { ok: false, error: error.message } : { ok: true, updated: opts.ids.length };
}

/** "Watch" a finished video: render + per-section clips/keyframes, the script
    it was made from (what each section was meant to show and say), the
    brief's QC criteria, and cost vs estimate. */
export async function qcPack(db: Db, videoId: string) {
  const media = await directedMedia(db, videoId);
  if ("error" in media) return media;
  const { data: sc } = await db.from("scripts").select("metadata").eq("video_id", videoId).order("version", { ascending: false }).limit(1).maybeSingle();
  const parsed = parseDirectedScript((sc?.metadata as { directed?: unknown } | null)?.directed);
  const script: DirectedScript | null = parsed.ok ? parsed.script : null;
  const { data: notes } = await db.from("approvals").select("gate, decision, notes, decided_at").eq("video_id", videoId).order("decided_at", { ascending: true });
  let t = 0;
  const sections = (script?.sections ?? []).map((s) => {
    const row = {
      idx: s.idx,
      label: s.label,
      startSec: t,
      sec: s.sec,
      model: s.model,
      spoken: s.lines.map((l) => `${l.speaker}: ${l.text}`),
      onScreenText: (s.labels ?? []).map((l) => l.text),
      intendedShot: s.videoPrompt.slice(0, 400),
      clip: media.assets.find((a) => a.kind === "clip" && a.section === s.idx)?.url ?? null,
      keyframe: media.assets.find((a) => a.kind === "keyframe" && a.section === s.idx)?.url ?? null,
    };
    t += s.sec;
    return row;
  });
  const render = media.assets.filter((a) => a.kind === "render");
  return {
    video: media.video,
    render: render.map((r) => ({ url: r.url, meta: r.meta })),
    resolution: script?.resolution ?? "720p",
    qcCriteria: script?.qc ?? "",
    estimate: script ? estimateDirected(script) : null,
    actualCostUsd: media.video.total_cost_usd,
    sections,
    clipJobs: media.clipJobs,
    history: notes ?? [],
    howToWatch:
      "Open render[0].url and watch it start to finish at least once (then the first 3 seconds again). If you cannot play video, review every section keyframe + clip in order against intendedShot/spoken/onScreenText. Score against qcCriteria and the playbook's QC gate; every failure becomes a revise_sections fix or a lesson.",
  };
}

// ── Director tools ──────────────────────────────────────────────────────

export async function createBotAgent(db: Db, opts: { projectId: string; name: string; monthlyCapUsd?: number }) {
  const { data: project } = await db.from("projects").select("id, name, status").eq("id", opts.projectId).maybeSingle();
  if (!project) return { ok: false, error: "project not found" };
  const token = newBotToken();
  const { data, error } = await db
    .from("bot_agents")
    .insert({ project_id: opts.projectId, name: opts.name, token_hash: hashToken(token), monthly_cap_usd: opts.monthlyCapUsd ?? 600 })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    botId: data.id,
    channel: project.name,
    // Shown ONCE — only its hash is stored.
    token,
    connector: { url: "https://faceless-studio-app.vercel.app/api/mcp", header: `Authorization: Bearer ${token}` },
  };
}

export async function updateBotAgent(db: Db, opts: { botId: string; active?: boolean; monthlyCapUsd?: number; rotateToken?: boolean }) {
  const patch: Record<string, unknown> = {};
  if (typeof opts.active === "boolean") patch.active = opts.active;
  if (typeof opts.monthlyCapUsd === "number" && opts.monthlyCapUsd >= 0) patch.monthly_cap_usd = opts.monthlyCapUsd;
  let token: string | undefined;
  if (opts.rotateToken) {
    token = newBotToken();
    patch.token_hash = hashToken(token);
  }
  if (!Object.keys(patch).length) return { ok: false, error: "nothing to change" };
  const { error } = await db.from("bot_agents").update(patch).eq("id", opts.botId);
  return error ? { ok: false, error: error.message } : { ok: true, ...(token ? { token } : {}) };
}

/** Director: daily digest across every bot. */
export async function botDigest(db: Db, opts: { sinceHours?: number }) {
  const since = new Date(Date.now() - (opts.sinceHours ?? 24) * 3600_000).toISOString();
  const { data: bots } = await db.from("bot_agents").select("id, name, project_id, monthly_cap_usd, active, last_seen_at");
  const out = [];
  for (const b of bots ?? []) {
    const ctx: BotContext = { id: b.id, name: b.name, projectId: b.project_id, monthlyCapUsd: Number(b.monthly_cap_usd) };
    const [budget, { data: vids }, { data: lessons }, { count: research }, { count: actions }] = await Promise.all([
      budgetStatus(db, ctx),
      db.from("videos").select("id, title, kind, status, total_cost_usd, paused_reason, created_at").eq("bot_agent_id", b.id).gte("created_at", since),
      db.from("bot_lessons").select("id, kind, lesson, evidence, video_id, created_at").eq("project_id", b.project_id).eq("status", "proposed"),
      db.from("bot_research").select("id", { count: "exact", head: true }).eq("project_id", b.project_id).gte("created_at", since),
      db.from("audit_log").select("id", { count: "exact", head: true }).eq("actor", `mcp:bot:${b.name}`).gte("created_at", since),
    ]);
    out.push({ bot: b.name, botId: b.id, projectId: b.project_id, active: b.active, lastSeen: b.last_seen_at, budget, videosSince: vids ?? [], lessonsAwaitingReview: lessons ?? [], researchNotesSince: research ?? 0, actionsSince: actions ?? 0 });
  }
  return { since, bots: out };
}
