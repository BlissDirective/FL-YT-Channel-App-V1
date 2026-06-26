import { GATE_FOR_STATUS } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getSignedMediaUrl } from "@/lib/storage";
import { estimateRevenueUsd } from "@/lib/adapters/youtube";
import { COPILOT_AUTO_APPROVE_SCORE } from "@/lib/adapters/qc";
import { VIDEO_PROVIDER } from "@/lib/adapters/video-models";
import type {
  AnalyticsSnapshot,
  Asset,
  BuildRun,
  BuildRunStatus,
  CostEntry,
  Idea,
  Insight,
  OperatorConfig,
  OperatorEvent,
  OperatorRun,
  OperatorStrategy,
  Project,
  Script,
  Video,
  VideoIntel,
} from "./types";
import {
  YPP_SUBS,
  YPP_WATCH_HOURS,
  YPP_SHORTS_VIEWS,
  desiredMixShortsPct,
  effectiveDailyCap,
  mixReason,
  nearerPath,
  type YppPath,
} from "@/lib/pipeline/monetization";

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Project) ?? null;
}

export type OperatorView = {
  run: OperatorRun | null;
  /** Live snapshot (null when there is no live run). */
  status: "active" | "paused" | null;
  cycleDay: number;
  cycleDays: number;
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  videosThisCycle: number;
  seededToday: number;
  postingHour: number;
  postingTz: string;
  /** Monetization (YPP) progress — present once analytics has been pulled. */
  hasAnalytics: boolean;
  subs: number;
  subsGoal: number;
  watchHours: number;
  watchGoal: number;
  shortsViews: number;
  shortsGoal: number;
  retentionPct: number;
  nearerPath: YppPath;
  mixShortsPct: number;
  mixReason: string;
  dailyCap: number;
};

/** Recent Auto Pilot Operator activity (homepage event log). */
export async function getOperatorEvents(projectId: string, limit = 8): Promise<OperatorEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("operator_events")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as OperatorEvent[]) ?? [];
}

/** The Auto Pilot Operator's live state for a project (drives the homepage
    panel). Reads the budget cycle straight from the ledger — no engine import,
    no service-role client needed. */
export async function getOperatorView(projectId: string): Promise<OperatorView> {
  const supabase = await createClient();
  const { data: runRow } = await supabase
    .from("operator_runs")
    .select("*")
    .eq("project_id", projectId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  const run = (runRow as OperatorRun) ?? null;
  const empty: OperatorView = {
    run: null, status: null, cycleDay: 0, cycleDays: 30,
    budgetUsd: 60, spentUsd: 0, remainingUsd: 60,
    videosThisCycle: 0, seededToday: 0, postingHour: 13, postingTz: "America/Chicago",
    hasAnalytics: false, subs: 0, subsGoal: YPP_SUBS, watchHours: 0, watchGoal: YPP_WATCH_HOURS,
    shortsViews: 0, shortsGoal: YPP_SHORTS_VIEWS, retentionPct: 0,
    nearerPath: "watch", mixShortsPct: 0.75, mixReason: "default mix", dailyCap: 1,
  };
  if (!run) return empty;

  const cfg = (run.config ?? {}) as OperatorConfig;
  const [{ data: spendRows }, { data: vids }] = await Promise.all([
    supabase.from("cost_ledger").select("usd").eq("project_id", projectId).gte("at", run.cycle_start),
    supabase.from("videos").select("created_at").eq("operator_run_id", run.id).gte("created_at", run.cycle_start),
  ]);
  const spent = (spendRows ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
  const budget = Number(run.cycle_budget_usd);
  const dayMs = Date.now() - new Date(run.cycle_start).getTime();
  const cycleDay = Math.max(1, Math.min(30, Math.floor(dayMs / 86_400_000) + 1));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const seededToday = ((vids ?? []) as { created_at: string }[]).filter(
    (v) => new Date(v.created_at).getTime() >= todayStart.getTime(),
  ).length;

  const strat = cfg.strategy as OperatorStrategy | undefined;
  const ch = strat?.channel;
  const baseMix = Number(cfg.mixShortsPct ?? 0.75);
  const ageDays = dayMs / 86_400_000;
  return {
    run,
    status: run.status === "stopped" ? null : run.status,
    cycleDay,
    cycleDays: 30,
    budgetUsd: budget,
    spentUsd: Math.round(spent * 100) / 100,
    remainingUsd: Math.round((budget - spent) * 100) / 100,
    videosThisCycle: (vids ?? []).length,
    seededToday,
    postingHour: Number(cfg.postingHour ?? 13),
    postingTz: String(cfg.postingTz ?? "America/Chicago"),
    hasAnalytics: Boolean(ch),
    subs: ch?.subs ?? 0,
    subsGoal: YPP_SUBS,
    watchHours: ch?.watchHours365 ?? 0,
    watchGoal: YPP_WATCH_HOURS,
    shortsViews: ch?.shortsViews90 ?? strat?.formatPerf?.short?.views ?? 0,
    shortsGoal: YPP_SHORTS_VIEWS,
    retentionPct: ch?.retentionPct ?? 0,
    nearerPath: nearerPath(strat),
    mixShortsPct: desiredMixShortsPct(baseMix, strat),
    mixReason: mixReason(strat),
    dailyCap: effectiveDailyCap({
      baseCap: Number(cfg.dailyCap ?? 1),
      maxCap: Number(cfg.maxDailyCap ?? 2),
      rampEnabled: Boolean(cfg.rampEnabled),
      ageDays,
      subs: ch?.subs ?? 0,
    }),
  };
}

/**
 * Pipeline videos: long-forms and native Shorts (both go through the gates).
 * Derived Shorts (parent_video_id set) are excluded by default — they're
 * managed from their parent long-form, not the main grid. Pass
 * { include: 'all' } to include them.
 */
export async function getVideos(
  projectId?: string,
  opts?: { include?: "pipeline" | "all" },
): Promise<Video[]> {
  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });
  if (projectId) query = query.eq("project_id", projectId);
  if ((opts?.include ?? "pipeline") === "pipeline") {
    query = query.is("parent_video_id", null);
  }
  const { data } = await query;
  return (data as Video[]) ?? [];
}

/** Shorts derived from a given parent long-form, newest first. */
export async function getDerivedShorts(parentVideoId: string): Promise<Video[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("*")
    .eq("parent_video_id", parentVideoId)
    .order("created_at", { ascending: false });
  return (data as Video[]) ?? [];
}

export async function getIdeas(projectId: string): Promise<Idea[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ideas")
    .select("*")
    .eq("project_id", projectId)
    .order("score", { ascending: false, nullsFirst: false });
  return (data as Idea[]) ?? [];
}

export type ActivityEntry = {
  id: string;
  kind: "video" | "idea";
  title: string;
  detail: string;
  at: string;
};

const STATUS_LABELS: Record<string, string> = {
  IDEA: "New idea card",
  IDEA_APPROVED: "Idea approved",
  SCRIPTING: "Writing script",
  SCRIPT_READY: "Script ready for review",
  GENERATING_ASSETS: "Generating assets",
  ASSETS_READY: "Assets ready for review",
  ASSEMBLING: "Rendering",
  FINAL_REVIEW: "Final render ready for review",
  APPROVED: "Approved — ready to upload",
  TRACKING: "Published & tracking",
  NEEDS_REVISION: "Revision requested",
  KILLED: "Killed",
};

/** Recent activity derived from video status changes and idea arrivals. */
export async function getActivity(limit = 8): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const [{ data: videos }, { data: ideas }, projects] = await Promise.all([
    supabase
      .from("videos")
      .select("id, title, status, updated_at, project_id")
      .order("updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("ideas")
      .select("id, title, created_at, project_id")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(limit),
    getProjects(),
  ]);

  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const entries: ActivityEntry[] = [
    ...(videos ?? []).map((v) => ({
      id: `v-${v.id}`,
      kind: "video" as const,
      title: `${STATUS_LABELS[v.status] ?? v.status}: “${v.title}”`,
      detail: projectName.get(v.project_id) ?? "",
      at: v.updated_at,
    })),
    ...(ideas ?? []).map((i) => ({
      id: `i-${i.id}`,
      kind: "idea" as const,
      title: `New idea: “${i.title}”`,
      detail: projectName.get(i.project_id) ?? "",
      at: i.created_at,
    })),
  ];
  return entries
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit);
}

/** Sum of every active project's monthly budget — the portfolio cap. */
export async function getMonthlyBudgetUsd(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("budget")
    .eq("status", "active");
  return (data ?? []).reduce(
    (sum, p) => sum + Number((p.budget as { monthlyUsd?: number })?.monthlyUsd ?? 0),
    0,
  );
}

export type QcReview = {
  id: string;
  video_id: string;
  gate: string;
  score: number;
  verdict: string;
  issues: string[];
  strengths: string[];
  auto_approved: boolean;
  created_at: string;
};

export type ReviewItem = {
  video: Video;
  script: Script | null;
  assets: Asset[];
  idea: Idea | null;
  qc: QcReview | null;
};

/** Videos needing attention on a project: at a review gate, mid-revision,
    or paused (budget / kill switch). */
export async function getReviewItems(projectId: string): Promise<ReviewItem[]> {
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("videos")
    .select("*")
    .eq("project_id", projectId)
    // Derived Shorts are managed from their parent long-form's Derive panel, not
    // the main Review queue — exclude them here too (mirrors getVideos).
    .is("parent_video_id", null)
    .order("updated_at", { ascending: false });

  // Transient stages the in-app pipeline drives and can stall in (worker crash,
  // serverless timeout, or a cron that never fired). These aren't gates and may
  // carry no paused_reason, so without this they'd vanish from the queue and the
  // Resume button (review-queue.tsx) would never render for them.
  const DRIVABLE = new Set(["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS"]);
  const attention = ((videos as Video[]) ?? []).filter(
    (v) =>
      GATE_FOR_STATUS[v.status] !== undefined ||
      v.status === "NEEDS_REVISION" ||
      DRIVABLE.has(v.status) ||
      (v.paused_reason && !["KILLED", "APPROVED", "TRACKING"].includes(v.status)),
  );
  if (attention.length === 0) return [];

  const ids = attention.map((v) => v.id);
  const ideaIds = attention.map((v) => v.idea_id).filter(Boolean) as string[];
  const [{ data: scripts }, { data: assets }, { data: ideas }, { data: qcRows }] =
    await Promise.all([
      supabase
        .from("scripts")
        .select("*")
        .in("video_id", ids)
        .order("version", { ascending: false }),
      supabase
        .from("assets")
        .select("*")
        .in("video_id", ids)
        .order("created_at", { ascending: true }),
      ideaIds.length
        ? supabase.from("ideas").select("*").in("id", ideaIds)
        : Promise.resolve({ data: [] as Idea[] }),
      supabase
        .from("qc_reviews")
        .select("*")
        .in("video_id", ids)
        .order("created_at", { ascending: false }),
    ]);

  // Resolve display URLs: external (Pexels) from meta, private storage via
  // short-lived signed URLs, mock paths stay null (gradient placeholders).
  const enriched = await Promise.all(
    (((assets as Asset[]) ?? [])).map(async (a) => ({
      ...a,
      url:
        (a.meta as { posterUrl?: string }).posterUrl ??
        (await getSignedMediaUrl(a.storage_path)),
    })),
  );

  return attention.map((video) => {
    const gate = GATE_FOR_STATUS[video.status];
    return {
      video,
      script:
        ((scripts as Script[]) ?? []).find((s) => s.video_id === video.id) ?? null,
      assets: enriched.filter((a) => a.video_id === video.id),
      idea: ((ideas as Idea[]) ?? []).find((i) => i.id === video.idea_id) ?? null,
      qc:
        ((qcRows as QcReview[]) ?? []).find(
          (q) => q.video_id === video.id && q.gate === gate,
        ) ?? null,
    };
  });
}

/** Count of videos waiting at a review gate, for nav badges. */
export function pendingGateCount(videos: Video[]): number {
  return videos.filter((v) => GATE_FOR_STATUS[v.status] !== undefined).length;
}

export async function getCostLedger(limit = 12): Promise<CostEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_ledger")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);
  return (data as CostEntry[]) ?? [];
}

/** Full cost ledger for the dedicated spend log — every recorded provider
    call / render cost, newest first. Capped generously so the page stays fast. */
export async function getAllCostEntries(limit = 1000): Promise<CostEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cost_ledger")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);
  return (data as CostEntry[]) ?? [];
}

/** Recent market-intelligence scans, newest first (optionally scoped). */
export async function getVideoIntelList(
  opts: { projectId?: string; videoId?: string; limit?: number } = {},
): Promise<VideoIntel[]> {
  const supabase = await createClient();
  let q = supabase
    .from("video_intel")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.videoId) q = q.eq("video_id", opts.videoId);
  const { data } = await q;
  return (data as VideoIntel[]) ?? [];
}

export type DownloadRow = {
  videoId: string;
  title: string;
  status: string;
  long: string | null;
  short: string | null;
  thumb: string | null;
};

/** Every video in a project with a finished render, ready to download for a
    manual YouTube upload. */
export async function getProjectDownloads(projectId: string): Promise<DownloadRow[]> {
  const supabase = await createClient();
  const { data: videos } = await supabase
    .from("videos")
    .select("id, title, status, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  const list = (videos as { id: string; title: string; status: string }[]) ?? [];
  if (list.length === 0) return [];

  const { data: assets } = await supabase
    .from("assets")
    .select("video_id, kind, storage_path, meta")
    .in("video_id", list.map((v) => v.id))
    .in("kind", ["render", "thumb"]);

  const rows: DownloadRow[] = [];
  for (const v of list) {
    const mine = (assets ?? []).filter((a) => a.video_id === v.id);
    const long = mine.find((a) => a.kind === "render" && (a.meta as { variant?: string }).variant !== "short");
    const short = mine.find((a) => a.kind === "render" && (a.meta as { variant?: string }).variant === "short");
    const thumb =
      mine.find((a) => a.kind === "thumb" && (a.meta as { selected?: boolean }).selected) ??
      mine.find((a) => a.kind === "thumb");
    if (!long && !short) continue; // nothing rendered yet
    const slug =
      v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) ||
      "video";
    rows.push({
      videoId: v.id,
      title: v.title,
      status: v.status,
      // Forced-download URLs (Content-Disposition: attachment) so the link saves
      // the file instead of playing it inline (matters on mobile Safari).
      long: long ? await getSignedMediaUrl(long.storage_path, 3600, `${slug}-1080p.mp4`) : null,
      short: short ? await getSignedMediaUrl(short.storage_path, 3600, `${slug}-short.mp4`) : null,
      thumb: thumb ? await getSignedMediaUrl(thumb.storage_path, 3600, `${slug}-thumb.jpg`) : null,
    });
  }
  return rows;
}

/** Pending/recent long-clip jobs for a video (drives per-section status). */
export async function getClipJobs(videoId: string): Promise<import("./types").ClipJob[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clip_jobs")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data as import("./types").ClipJob[]) ?? [];
}

/** Portfolio-wide AI video-generation spend this calendar month (for the cap). */
export async function getMonthlyVideoSpendUsd(): Promise<number> {
  const supabase = await createClient();
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const { data } = await supabase
    .from("cost_ledger")
    .select("usd")
    .eq("provider", VIDEO_PROVIDER)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

export async function getKillSwitch(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean })?.enabled);
}

export type PortfolioStats = {
  projectCount: number;
  publishedCount: number;
  inPipelineCount: number;
  monthlyCostUsd: number;
  totalViews: number;
  totalLikes: number;
  estRevenueUsd: number;
};

export async function getPortfolioStats(): Promise<PortfolioStats> {
  const supabase = await createClient();
  const [{ count: projectCount }, videos, { data: ledger }, tracked] =
    await Promise.all([
      supabase.from("projects").select("*", { count: "exact", head: true }),
      getVideos(),
      supabase
        .from("cost_ledger")
        .select("usd, at")
        .gte(
          "at",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        ),
      getTrackedStats(),
    ]);

  const publishedCount = videos.filter(
    (v) => v.status === "TRACKING" || v.youtube_video_id,
  ).length;
  const inPipelineCount = videos.filter(
    (v) => !["TRACKING", "APPROVED", "KILLED"].includes(v.status),
  ).length;
  const monthlyCostUsd = (ledger ?? []).reduce(
    (sum, r) => sum + Number(r.usd ?? 0),
    0,
  );

  return {
    projectCount: projectCount ?? 0,
    publishedCount,
    inPipelineCount,
    monthlyCostUsd,
    totalViews: tracked.reduce((s, t) => s + t.views, 0),
    totalLikes: tracked.reduce((s, t) => s + t.likes, 0),
    estRevenueUsd: tracked.reduce((s, t) => s + t.estRevenueUsd, 0),
  };
}

export type TrackedStat = {
  videoId: string;
  projectId: string;
  projectName: string;
  title: string;
  youtubeVideoId: string;
  publishedAt: string | null;
  views: number;
  likes: number;
  comments: number;
  estRevenueUsd: number;
  capturedAt: string | null;
};

/**
 * Latest snapshot per tracked video, joined to its project's RPM for
 * estimated revenue. Drives the overview totals, project tracking rows,
 * and the CSV export. Pass a projectId to scope to one project.
 */
export async function getTrackedStats(projectId?: string): Promise<TrackedStat[]> {
  const supabase = await createClient();
  let vq = supabase
    .from("videos")
    .select("id, project_id, title, youtube_video_id, published_at")
    .not("youtube_video_id", "is", null);
  if (projectId) vq = vq.eq("project_id", projectId);
  const { data: videos } = await vq;

  const tracked = (videos ?? []).filter((v) => v.youtube_video_id);
  if (tracked.length === 0) return [];

  const ids = tracked.map((v) => v.id);
  const [{ data: snaps }, { data: projects }] = await Promise.all([
    supabase
      .from("analytics_snapshots")
      .select("video_id, views, likes, comments, captured_at")
      .in("video_id", ids)
      .order("captured_at", { ascending: false }),
    supabase.from("projects").select("id, name, rpm_usd"),
  ]);

  // First row per video is the most recent (query is desc on captured_at).
  const latest = new Map<string, AnalyticsSnapshot>();
  for (const s of (snaps as AnalyticsSnapshot[]) ?? []) {
    if (!latest.has(s.video_id)) latest.set(s.video_id, s);
  }
  const projMeta = new Map(
    (projects ?? []).map((p) => [p.id, { name: p.name, rpm: Number(p.rpm_usd ?? 2) }]),
  );

  return tracked.map((v) => {
    const snap = latest.get(v.id);
    const meta = projMeta.get(v.project_id) ?? { name: "", rpm: 2 };
    const views = Number(snap?.views ?? 0);
    return {
      videoId: v.id,
      projectId: v.project_id,
      projectName: meta.name,
      title: v.title,
      youtubeVideoId: v.youtube_video_id as string,
      publishedAt: v.published_at ?? null,
      views,
      likes: Number(snap?.likes ?? 0),
      comments: Number(snap?.comments ?? 0),
      estRevenueUsd: estimateRevenueUsd(views, meta.rpm),
      capturedAt: snap?.captured_at ?? null,
    };
  });
}

export type InsightWithProject = Insight & { projectName: string };

/** New (and recently applied) insight cards across projects, for /insights. */
export async function getInsights(): Promise<InsightWithProject[]> {
  const supabase = await createClient();
  const [{ data }, projects] = await Promise.all([
    supabase
      .from("insights")
      .select("*")
      .neq("status", "dismissed")
      .order("created_at", { ascending: false })
      .limit(50),
    getProjects(),
  ]);
  const name = new Map(projects.map((p) => [p.id, p.name]));
  return ((data as Insight[]) ?? []).map((i) => ({
    ...i,
    projectName: i.project_id ? (name.get(i.project_id) ?? "") : "Portfolio",
  }));
}

export type QcAgreement = {
  total: number;
  agree: number;
  rate: number; // 0–1
};

/**
 * QC-vs-you agreement: of the gates a human decided that QC also scored, how
 * often did QC's predicted call (score ≥ auto-approve threshold ⇒ approve)
 * match the human's approve/revise decision. Surfaced in settings so the
 * operator knows when it's safe to raise autonomy.
 */
export async function getQcAgreement(): Promise<QcAgreement> {
  const supabase = await createClient();
  const [{ data: qc }, { data: approvals }] = await Promise.all([
    supabase.from("qc_reviews").select("video_id, gate, score, created_at"),
    supabase
      .from("approvals")
      .select("video_id, gate, decision, decided_by, decided_at")
      .eq("decided_by", "human")
      .in("decision", ["approved", "revision"]),
  ]);

  // Latest QC score per video+gate.
  const qcByKey = new Map<string, number>();
  for (const r of (qc ?? []) as { video_id: string; gate: string; score: number }[]) {
    const key = `${r.video_id}:${r.gate}`;
    if (!qcByKey.has(key)) qcByKey.set(key, Number(r.score));
  }

  let total = 0;
  let agree = 0;
  for (const a of (approvals ?? []) as { video_id: string; gate: string; decision: string }[]) {
    const score = qcByKey.get(`${a.video_id}:${a.gate}`);
    if (score == null) continue;
    total += 1;
    const qcApprove = score >= COPILOT_AUTO_APPROVE_SCORE;
    const humanApprove = a.decision === "approved";
    if (qcApprove === humanApprove) agree += 1;
  }
  return { total, agree, rate: total > 0 ? agree / total : 0 };
}

/** Full snapshot history for one video, oldest → newest (for the sparkline). */
export async function getVideoSnapshots(
  videoId: string,
): Promise<AnalyticsSnapshot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analytics_snapshots")
    .select("*")
    .eq("video_id", videoId)
    .order("captured_at", { ascending: true });
  return (data as AnalyticsSnapshot[]) ?? [];
}

// ── Build & Post runs (dashboard) ─────────────────────────────────────

export type BuildRunVideo = {
  id: string;
  title: string;
  status: string;
  kind: string;
  costUsd: number;
  scheduledPublishAt: string | null;
  publishPrivacy: string | null;
  youtubeVideoId: string | null;
  pausedReason: string | null;
  qcScore: number | null;
  views: number | null;
};

export type BuildRunRow = {
  id: string;
  status: BuildRunStatus;
  kind: string;
  tier: string;
  count: number;
  thumbStyle: string;
  scheduleMode: string;
  ideaSource: string;
  estCostUsd: number;
  actualUsd: number;
  createdAt: string;
  videos: BuildRunVideo[];
};

/** Recent Build & Post runs with their videos, live cost, and final QC score —
    powers the run dashboard on the project home. */
export async function getBuildRuns(
  projectId: string,
  limit = 5,
): Promise<BuildRunRow[]> {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from("build_runs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const runRows = (runs as BuildRun[]) ?? [];
  if (runRows.length === 0) return [];

  const runIds = runRows.map((r) => r.id);
  const { data: vids } = await supabase
    .from("videos")
    .select(
      "id, title, status, kind, total_cost_usd, scheduled_publish_at, publish_privacy, youtube_video_id, paused_reason, build_run_id",
    )
    .in("build_run_id", runIds);
  const vRows =
    (vids as (Pick<
      Video,
      | "id"
      | "title"
      | "status"
      | "kind"
      | "total_cost_usd"
      | "scheduled_publish_at"
      | "publish_privacy"
      | "youtube_video_id"
      | "paused_reason"
    > & { build_run_id: string })[]) ?? [];

  // Latest FINAL-gate QC score + latest view count per video (most recent wins).
  const videoIds = vRows.map((v) => v.id);
  const scoreByVideo = new Map<string, number>();
  const viewsByVideo = new Map<string, number>();
  if (videoIds.length > 0) {
    const [{ data: revs }, { data: snaps }] = await Promise.all([
      supabase
        .from("qc_reviews")
        .select("video_id, score, gate, created_at")
        .in("video_id", videoIds)
        .eq("gate", "FINAL")
        .order("created_at", { ascending: false }),
      supabase
        .from("analytics_snapshots")
        .select("video_id, views, captured_at")
        .in("video_id", videoIds)
        .order("captured_at", { ascending: false }),
    ]);
    for (const r of (revs as { video_id: string; score: number }[]) ?? []) {
      if (!scoreByVideo.has(r.video_id)) scoreByVideo.set(r.video_id, Number(r.score));
    }
    for (const s of (snaps as { video_id: string; views: number }[]) ?? []) {
      if (!viewsByVideo.has(s.video_id)) viewsByVideo.set(s.video_id, Number(s.views));
    }
  }

  const byRun = new Map<string, BuildRunVideo[]>();
  for (const v of vRows) {
    const list = byRun.get(v.build_run_id) ?? [];
    list.push({
      id: v.id,
      title: v.title,
      status: v.status,
      kind: v.kind,
      costUsd: Number(v.total_cost_usd ?? 0),
      scheduledPublishAt: v.scheduled_publish_at,
      publishPrivacy: v.publish_privacy,
      youtubeVideoId: v.youtube_video_id,
      pausedReason: v.paused_reason,
      qcScore: scoreByVideo.get(v.id) ?? null,
      views: viewsByVideo.get(v.id) ?? null,
    });
    byRun.set(v.build_run_id, list);
  }

  return runRows.map((r) => {
    const videos = byRun.get(r.id) ?? [];
    return {
      id: r.id,
      status: r.status,
      kind: r.kind,
      tier: r.tier,
      count: r.count,
      thumbStyle: r.thumb_style,
      scheduleMode: r.schedule_mode,
      ideaSource: r.idea_source,
      estCostUsd: Number(r.est_cost_usd ?? 0),
      actualUsd: videos.reduce((s, v) => s + v.costUsd, 0),
      createdAt: r.created_at,
      videos,
    };
  });
}
