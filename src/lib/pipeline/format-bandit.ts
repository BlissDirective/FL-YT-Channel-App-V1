import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { armKey, formatOfArm, median, rewardFromOutcome, sampleArms, type ArmStats } from "@/lib/pipeline/bandit";

/**
 * DB-facing format bandit (Harness C5). Builds arm stats from a project's
 * published videos and Thompson-samples the next format. Below a data floor
 * the caller falls back to the fixed monetization-aware mix (the bandit can't
 * learn from nothing). Reward = did the video beat the channel's median views.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Total pulls below which the bandit stays out of the way (exploration-only). */
export const BANDIT_DATA_FLOOR = 8;

export type FormatArms = {
  arms: Map<string, ArmStats>;
  totalTrials: number;
  medianViews: number;
};

export async function buildFormatArms(db: Db, projectId: string): Promise<FormatArms> {
  const { data: vids } = await db
    .from("videos")
    .select("id, kind, target_length_sec, build_run_id")
    .eq("project_id", projectId)
    .not("youtube_video_id", "is", null);
  const tracked = (vids ?? []) as {
    id: string;
    kind: string;
    target_length_sec: number | null;
    build_run_id: string | null;
  }[];
  const arms = new Map<string, ArmStats>();
  if (tracked.length === 0) return { arms, totalTrials: 0, medianViews: 0 };

  // Latest outcome per video — engaged views when available (B4; the truer
  // signal for Shorts since Mar 2025), else raw views.
  const { data: snaps } = await db
    .from("analytics_snapshots")
    .select("video_id, views, engaged_views, captured_at")
    .in("video_id", tracked.map((v) => v.id))
    .order("captured_at", { ascending: false });
  const viewsByVideo = new Map<string, number>();
  for (const s of (snaps ?? []) as { video_id: string; views: number; engaged_views: number | null }[]) {
    if (!viewsByVideo.has(s.video_id)) {
      viewsByVideo.set(s.video_id, Number(s.engaged_views ?? s.views ?? 0));
    }
  }

  // Tier per video via its build run.
  const runIds = [...new Set(tracked.map((v) => v.build_run_id).filter(Boolean))] as string[];
  const tierByRun = new Map<string, string>();
  if (runIds.length) {
    const { data: runs } = await db.from("build_runs").select("id, tier").in("id", runIds);
    for (const r of (runs ?? []) as { id: string; tier: string }[]) tierByRun.set(r.id, r.tier);
  }

  const withViews = tracked.filter((v) => viewsByVideo.has(v.id));
  const medianViews = median(withViews.map((v) => viewsByVideo.get(v.id) ?? 0));

  for (const v of withViews) {
    const views = viewsByVideo.get(v.id) ?? 0;
    const format = v.kind === "short" ? "short" : "long";
    const tier = (v.build_run_id ? tierByRun.get(v.build_run_id) : undefined) ?? "economy";
    const key = armKey(format, Number(v.target_length_sec ?? 0), tier);
    const arm = arms.get(key) ?? { successes: 0, trials: 0 };
    arm.trials += 1;
    arm.successes += rewardFromOutcome(views, medianViews);
    arms.set(key, arm);
  }
  return { arms, totalTrials: withViews.length, medianViews };
}

/** Runtime standard-normal via Box–Muller over Math.random. */
function gauss(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const a = Math.max(1e-12, u1);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u2);
}

export type FormatDecision = { format: "short" | "long"; arm: string; exploring: boolean } | null;

/**
 * Thompson-sample the next format. Returns null below the data floor so the
 * caller keeps the monetization-aware fixed mix until there's signal.
 */
export async function sampleFormatDecision(db: Db, projectId: string): Promise<FormatDecision> {
  const { arms, totalTrials } = await buildFormatArms(db, projectId);
  if (totalTrials < BANDIT_DATA_FLOOR || arms.size < 2) return null;
  const ranked = sampleArms(arms, gauss);
  if (ranked.length === 0) return null;
  const top = ranked[0];
  return { format: formatOfArm(top.key), arm: top.key, exploring: top.exploring };
}
