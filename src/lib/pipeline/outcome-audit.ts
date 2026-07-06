import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyticsConfigured, getVideoMetrics } from "@/lib/adapters/youtube-analytics";
import { recordNamespaceLesson, runQualityGraduation } from "@/lib/pipeline/memory-service";
import { getQualityGateConfig } from "@/lib/pipeline/quality-gates";

/**
 * Outcome-audit loop (Harness C3, Fable5-Agentic-Harness-Plan.md).
 *
 * The QC judge's real reward — retention/views — lands days after it scores.
 * This nightly pass joins each tracked video's FINAL-gate QC score with its
 * actual outcome and reports the Spearman rank correlation. If FINAL-QC score
 * stops predicting retention, the judge is drifting or being gamed — the
 * anti-reward-hacking signal. Correlations feed the C1 calibration surface.
 */

type Db = ReturnType<typeof createAdminClient>;

const MIN_N = 6; // below this the correlation is noise

// ── Pure stats (unit-tested) ──────────────────────────────────────────

/** Average ranks (ties share the mean rank) — the basis for Spearman. */
export function averageRanks(values: number[]): number[] {
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let k = 0;
  while (k < idx.length) {
    let j = k;
    while (j + 1 < idx.length && idx[j + 1].v === idx[k].v) j++;
    const rank = (k + j) / 2 + 1; // 1-based average rank for the tie group
    for (let t = k; t <= j; t++) ranks[idx[t].i] = rank;
    k = j + 1;
  }
  return ranks;
}

/** Spearman rank correlation in [-1, 1], or null when undefined (n<3 or no variance). */
export function spearman(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const rx = averageRanks(xs.slice(0, n));
  const ry = averageRanks(ys.slice(0, n));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx;
    const dy = ry[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null; // no variance → undefined
  return Math.round((cov / Math.sqrt(vx * vy)) * 1000) / 1000;
}

// ── The audit ─────────────────────────────────────────────────────────

export async function runOutcomeAudit(db: Db, projectId: string): Promise<{ wrote: number }> {
  const { data: project } = await db
    .from("projects")
    .select("id, youtube_refresh_token")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { wrote: 0 };

  // Tracked videos with a FINAL QC score.
  const { data: vids } = await db
    .from("videos")
    .select("id, youtube_video_id, topic, watch_review")
    .eq("project_id", projectId)
    .not("youtube_video_id", "is", null);
  const tracked = (vids ?? []) as {
    id: string;
    youtube_video_id: string | null;
    topic?: string;
    watch_review?: { overall?: number; degraded?: boolean } | null;
  }[];
  if (tracked.length < MIN_N) return { wrote: 0 };
  const ids = tracked.map((v) => v.id);

  const { data: revs } = await db
    .from("qc_reviews")
    .select("video_id, score, created_at")
    .in("video_id", ids)
    .eq("gate", "FINAL")
    .order("created_at", { ascending: false });
  const scoreByVideo = new Map<string, number>();
  for (const r of (revs ?? []) as { video_id: string; score: number }[]) {
    if (!scoreByVideo.has(r.video_id)) scoreByVideo.set(r.video_id, Number(r.score));
  }

  // Views (always available) from the latest snapshot.
  const { data: snaps } = await db
    .from("analytics_snapshots")
    .select("video_id, views, captured_at")
    .in("video_id", ids)
    .order("captured_at", { ascending: false });
  const viewsByVideo = new Map<string, number>();
  for (const s of (snaps ?? []) as { video_id: string; views: number }[]) {
    if (!viewsByVideo.has(s.video_id)) viewsByVideo.set(s.video_id, Number(s.views ?? 0));
  }

  // Retention (only with Analytics OAuth).
  const retentionByVideo = new Map<string, number>();
  if (analyticsConfigured(project.youtube_refresh_token)) {
    try {
      const ytIds = tracked.map((v) => v.youtube_video_id!).filter(Boolean);
      const metrics = await getVideoMetrics(project.youtube_refresh_token, ytIds);
      for (const v of tracked) {
        const m = v.youtube_video_id ? metrics.get(v.youtube_video_id) : undefined;
        if (m) retentionByVideo.set(v.id, m.retentionPct);
      }
    } catch (err) {
      console.error("outcome-audit retention fetch failed (non-fatal):", err);
    }
  }

  // Self-Watch overall score per video (Phase 4): does the pre-publish gate
  // predict outcomes, the same anti-reward-hacking check applied to QC?
  const watchByVideo = new Map<string, number>();
  for (const v of tracked) {
    const wr = v.watch_review;
    if (wr && !wr.degraded && typeof wr.overall === "number") watchByVideo.set(v.id, wr.overall);
  }

  const audits: { gate: string; metric: string; correlation: number; n: number; note: string }[] = [];
  const pushAudit = (gate: string, label: string, scoreMap: Map<string, number>, outcome: Map<string, number>, metric: string) => {
    const scores: number[] = [];
    const outs: number[] = [];
    for (const [vid, score] of scoreMap) {
      const o = outcome.get(vid);
      if (o != null) {
        scores.push(score);
        outs.push(o);
      }
    }
    if (scores.length < MIN_N) return;
    const r = spearman(scores, outs);
    if (r == null) return;
    const note =
      r >= 0.3
        ? `${label} predicts ${metric} (ρ=${r.toFixed(2)}, n=${scores.length}).`
        : r <= 0.05
          ? `⚠ ${label} does NOT predict ${metric} (ρ=${r.toFixed(2)}, n=${scores.length}) — drifting or gamed; review the criteria.`
          : `Weak link between ${label} and ${metric} (ρ=${r.toFixed(2)}, n=${scores.length}).`;
    audits.push({ gate, metric: `${gate === "WATCH" ? "watch→" : ""}${metric}`, correlation: r, n: scores.length, note });
  };

  pushAudit("FINAL", "FINAL QC", scoreByVideo, viewsByVideo, "views");
  if (retentionByVideo.size >= MIN_N) pushAudit("FINAL", "FINAL QC", scoreByVideo, retentionByVideo, "retention");
  pushAudit("WATCH", "Self-Watch", watchByVideo, viewsByVideo, "views");
  if (retentionByVideo.size >= MIN_N) pushAudit("WATCH", "Self-Watch", watchByVideo, retentionByVideo, "retention");

  for (const a of audits) {
    await db.from("outcome_audits").insert({
      project_id: projectId,
      gate: a.gate,
      metric: a.metric,
      correlation: a.correlation,
      n: a.n,
      note: a.note,
    });
  }

  // Outcome namespace (C8): record the channel's proven winner so the Self-Watch
  // competitive judge (#4) reads real, metric-linked context. Evidence = views.
  try {
    let best: { topic?: string; views: number } | null = null;
    for (const v of tracked) {
      const views = viewsByVideo.get(v.id) ?? 0;
      if (v.topic && views > 0 && (!best || views > best.views)) best = { topic: v.topic, views };
    }
    if (best?.topic) {
      await recordNamespaceLesson(db, projectId, "outcome", {
        text: `Proven winner in this niche: "${best.topic}" (${best.views} views)`,
        evidence: `${best.views} views`,
        confidence: 0.4,
      });
    }
  } catch (err) {
    console.error("outcome-lesson write failed (non-fatal):", err);
  }

  // Shadow→graduate lifecycle (C8): promote recurring `quality` shadow lessons
  // to gating, retire the ones that faded. Best-effort — never blocks the audit.
  try {
    const qg = await getQualityGateConfig(db);
    await runQualityGraduation(db, projectId, {
      shadowMinEvidence: qg.playbookShadowMinEvidence,
      autoGraduateConfidence: qg.playbookAutoGraduateConfidence,
    });
  } catch (err) {
    console.error("quality graduation (outcome-audit) failed (non-fatal):", err);
  }

  return { wrote: audits.length };
}

export async function runOutcomeAuditAllProjects(): Promise<{ projects: number; wrote: number }> {
  const db = createAdminClient();
  const { data: projects } = await db.from("projects").select("id").eq("status", "active");
  let wrote = 0;
  for (const p of (projects ?? []) as { id: string }[]) {
    try {
      wrote += (await runOutcomeAudit(db, p.id)).wrote;
    } catch (err) {
      console.error(`outcome-audit ${p.id} failed:`, err);
    }
  }
  return { projects: (projects ?? []).length, wrote };
}
