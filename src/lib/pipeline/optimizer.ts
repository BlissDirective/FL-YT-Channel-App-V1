import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInsights } from "@/lib/adapters/optimizer";
import { analyticsConfigured, getRetentionCurve } from "@/lib/adapters/youtube-analytics";
import { DEFAULT_SCRIPT_TEMPLATE } from "@/lib/pipeline/templates";

/**
 * Weekly Optimizer run (Phase 8). Correlates a project's tracked stats with
 * its videos' attributes and writes insight cards to /insights, some carrying
 * a proposed script-template revision. Skips insight titles already present
 * (avoids weekly duplicates). Service-role client for the unauthenticated cron.
 */
export async function runOptimizer(projectId: string): Promise<{ created: number }> {
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("id, niche, audience, auto_apply_insights, youtube_refresh_token")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { created: 0 };

  // Phase 4.3 — settle last week's canaries before generating new insights.
  try {
    await evaluateCanaries(db, projectId);
  } catch (err) {
    console.error("canary evaluation failed:", err);
  }

  // Tracked videos + their latest snapshot.
  const { data: videos } = await db
    .from("videos")
    .select("id, title, format, target_length_sec")
    .eq("project_id", projectId)
    .not("youtube_video_id", "is", null);
  const tracked = videos ?? [];
  if (tracked.length < 2) return { created: 0 };

  const { data: snaps } = await db
    .from("analytics_snapshots")
    .select("video_id, views, likes, comments, captured_at")
    .in(
      "video_id",
      tracked.map((v) => v.id),
    )
    .order("captured_at", { ascending: false });
  const latest = new Map<string, { views: number; likes: number; comments: number }>();
  for (const s of snaps ?? []) {
    if (!latest.has(s.video_id)) {
      latest.set(s.video_id, { views: s.views, likes: s.likes, comments: s.comments });
    }
  }

  const rows = tracked.map((v) => {
    const s = latest.get(v.id) ?? { views: 0, likes: 0, comments: 0 };
    return {
      title: v.title,
      format: v.format,
      lengthSec: v.target_length_sec,
      views: s.views,
      likes: s.likes,
      comments: s.comments,
    };
  });

  // Current active script template (to diff against).
  const { data: tmpl } = await db
    .from("prompt_templates")
    .select("body")
    .eq("project_id", projectId)
    .eq("kind", "script")
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Phase 4.6 — beat-level retention findings: overlay YouTube's audience
  // retention curve onto the render's stored beat timeline and name the beats
  // that bleed viewers. Fed to the insight model as evidence.
  let retentionNotes: string[] = [];
  try {
    retentionNotes = await beatRetentionNotes(db, projectId, project.youtube_refresh_token, tracked);
  } catch (err) {
    console.error("retention analysis failed (non-fatal):", err);
  }

  const { insights, costUsd } = await generateInsights({
    niche: project.niche ?? "",
    audience: project.audience ?? "",
    videos: rows,
    scriptTemplate: tmpl?.body ?? DEFAULT_SCRIPT_TEMPLATE,
    retentionNotes,
  });

  // Dedup against every prior insight regardless of status — a dismissed or
  // applied insight must not be regenerated verbatim the following week.
  const { data: existing } = await db
    .from("insights")
    .select("title")
    .eq("project_id", projectId);
  const seen = new Set((existing ?? []).map((e) => norm(e.title)));

  let created = 0;
  for (const ins of insights) {
    if (seen.has(norm(ins.title))) continue;
    const { data: inserted } = await db
      .from("insights")
      .insert({
        project_id: projectId,
        kind: "optimizer",
        title: ins.title,
        body: ins.body,
        evidence: { metric: ins.metric ?? null, videoCount: rows.length },
        proposed_template_kind: ins.proposedTemplateKind ?? null,
        proposed_template_body: ins.proposedTemplateBody ?? null,
      })
      .select("id")
      .maybeSingle();
    created += 1;

    // Phase 4.3 — auto-apply as a CANARY when the project opted in: the
    // proposal ships as a new active template version immediately, but the
    // next evaluation compares the canary videos' FINAL QC against the
    // trailing baseline and auto-reverts a regression. Closed learning loop,
    // bounded blast radius.
    if (
      project.auto_apply_insights &&
      inserted?.id &&
      ins.proposedTemplateKind &&
      ins.proposedTemplateBody
    ) {
      try {
        await autoApplyInsightAsCanary(db, projectId, inserted.id, ins.proposedTemplateKind, ins.proposedTemplateBody);
      } catch (err) {
        console.error("insight auto-apply failed:", err);
      }
    }
  }

  if (costUsd > 0) {
    await db.from("cost_ledger").insert({
      project_id: projectId,
      provider: "anthropic",
      description: `Optimizer run — ${created} insight${created === 1 ? "" : "s"}`,
      usd: costUsd,
    });
  }
  return { created };
}

export async function runOptimizerAllProjects(): Promise<{ created: number; projects: number }> {
  const db = createAdminClient();
  const { data: projects } = await db.from("projects").select("id").eq("status", "active");
  let created = 0;
  for (const p of projects ?? []) {
    created += (await runOptimizer(p.id)).created;
  }
  return { created, projects: (projects ?? []).length };
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type Db = ReturnType<typeof createAdminClient>;

/**
 * Map retention-curve drops back to script beats via the render's stored
 * beat timeline (assets.meta.beats, written by the farm). Reports the two
 * steepest drops per video (>=5 points) for up to 3 recent videos.
 */
async function beatRetentionNotes(
  db: Db,
  projectId: string,
  refreshToken: string | null,
  tracked: { id: string; title: string }[],
): Promise<string[]> {
  if (!analyticsConfigured(refreshToken)) return [];
  const notes: string[] = [];
  for (const v of tracked.slice(0, 3)) {
    const { data: ytRow } = await db
      .from("videos")
      .select("youtube_video_id, target_length_sec")
      .eq("id", v.id)
      .maybeSingle();
    if (!ytRow?.youtube_video_id) continue;
    const { data: render } = await db
      .from("assets")
      .select("meta")
      .eq("video_id", v.id)
      .eq("kind", "render")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const meta = (render?.meta ?? {}) as { beats?: { idx: number; start: number; end: number }[]; durationSec?: number };
    const timeline = meta.beats ?? [];
    if (timeline.length === 0) continue;
    const durationSec = Number(meta.durationSec ?? ytRow.target_length_sec ?? 0);
    if (durationSec <= 0) continue;

    const curve = await getRetentionCurve(refreshToken, ytRow.youtube_video_id);
    if (!curve || curve.length < 5) continue;

    const drops: { atSec: number; drop: number }[] = [];
    for (let i = 1; i < curve.length; i++) {
      const drop = curve[i - 1].watchRatio - curve[i].watchRatio;
      if (drop >= 0.05) drops.push({ atSec: curve[i].ratio * durationSec, drop });
    }
    drops.sort((a, b) => b.drop - a.drop);
    for (const d of drops.slice(0, 2)) {
      const beat = timeline.find((t) => d.atSec >= t.start && d.atSec < t.end);
      if (!beat) continue;
      notes.push(
        `"${v.title}": beat ${beat.idx + 1} (~${Math.round(d.atSec)}s) loses ${Math.round(d.drop * 100)}% of remaining viewers`,
      );
    }
  }
  return notes;
}

const CANARY_MIN_VIDEOS = 3;
const CANARY_REGRESSION_MARGIN = 0.3;

/** Trailing average FINAL-gate QC score for a project (the canary baseline). */
async function trailingFinalQc(db: Db, projectId: string, limit = 5): Promise<number | null> {
  const { data: vids } = await db.from("videos").select("id").eq("project_id", projectId);
  const ids = (vids ?? []).map((v) => v.id);
  if (ids.length === 0) return null;
  const { data: revs } = await db
    .from("qc_reviews")
    .select("score")
    .in("video_id", ids)
    .eq("gate", "FINAL")
    .order("created_at", { ascending: false })
    .limit(limit);
  const scores = (revs ?? []).map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Publish the proposal as the new active template version + canary marker. */
async function autoApplyInsightAsCanary(
  db: Db,
  projectId: string,
  insightId: string,
  kind: string,
  body: string,
): Promise<void> {
  const { data: latest } = await db
    .from("prompt_templates")
    .select("version")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  await db
    .from("prompt_templates")
    .update({ active: false })
    .eq("project_id", projectId)
    .eq("kind", kind);
  const { error } = await db.from("prompt_templates").insert({
    project_id: projectId,
    kind,
    version,
    body,
    active: true,
  });
  if (error) throw new Error(error.message);
  await db
    .from("insights")
    .update({
      status: "applied",
      applied_template_version: version,
      canary: {
        templateVersion: version,
        kind,
        appliedAt: new Date().toISOString(),
        baselineQc: await trailingFinalQc(db, projectId),
      },
    })
    .eq("id", insightId);
}

/**
 * Evaluate open canaries: once >= CANARY_MIN_VIDEOS project videos created
 * after apply have FINAL QC reviews, keep the template if the average holds
 * within CANARY_REGRESSION_MARGIN of baseline, else revert to the previous
 * version and mark the insight 'reverted'.
 */
export async function evaluateCanaries(db: Db, projectId: string): Promise<{ settled: number }> {
  const { data: open } = await db
    .from("insights")
    .select("id, canary")
    .eq("project_id", projectId)
    .eq("status", "applied")
    .not("canary", "is", null);
  let settled = 0;
  for (const ins of open ?? []) {
    const canary = ins.canary as {
      templateVersion: number;
      kind: string;
      appliedAt: string;
      baselineQc: number | null;
      evaluatedAt?: string;
    };
    if (!canary?.appliedAt || canary.evaluatedAt) continue;

    const { data: vids } = await db
      .from("videos")
      .select("id")
      .eq("project_id", projectId)
      .gt("created_at", canary.appliedAt);
    const ids = (vids ?? []).map((v) => v.id);
    if (ids.length === 0) continue;
    const { data: revs } = await db
      .from("qc_reviews")
      .select("score, video_id")
      .in("video_id", ids)
      .eq("gate", "FINAL");
    const scores = (revs ?? []).map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
    if (scores.length < CANARY_MIN_VIDEOS) continue; // keep waiting

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const regressed = canary.baselineQc != null && avg < canary.baselineQc - CANARY_REGRESSION_MARGIN;
    if (regressed) {
      // Revert: deactivate the canary version, reactivate the previous one.
      await db
        .from("prompt_templates")
        .update({ active: false })
        .eq("project_id", projectId)
        .eq("kind", canary.kind)
        .eq("version", canary.templateVersion);
      const { data: prev } = await db
        .from("prompt_templates")
        .select("version")
        .eq("project_id", projectId)
        .eq("kind", canary.kind)
        .lt("version", canary.templateVersion)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prev) {
        await db
          .from("prompt_templates")
          .update({ active: true })
          .eq("project_id", projectId)
          .eq("kind", canary.kind)
          .eq("version", prev.version);
      }
    }
    await db
      .from("insights")
      .update({
        status: regressed ? "reverted" : "applied",
        canary: {
          ...canary,
          evaluatedAt: new Date().toISOString(),
          outcome: regressed ? "reverted" : "kept",
          canaryQc: Math.round(avg * 100) / 100,
        },
      })
      .eq("id", ins.id);
    settled += 1;
  }
  return { settled };
}
