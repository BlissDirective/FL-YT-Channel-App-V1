import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInsights } from "@/lib/adapters/optimizer";
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
    .select("id, niche, audience")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { created: 0 };

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

  const { insights, costUsd } = await generateInsights({
    niche: project.niche ?? "",
    audience: project.audience ?? "",
    videos: rows,
    scriptTemplate: tmpl?.body ?? DEFAULT_SCRIPT_TEMPLATE,
  });

  const { data: existing } = await db
    .from("insights")
    .select("title")
    .eq("project_id", projectId)
    .eq("status", "new");
  const seen = new Set((existing ?? []).map((e) => norm(e.title)));

  let created = 0;
  for (const ins of insights) {
    if (seen.has(norm(ins.title))) continue;
    await db.from("insights").insert({
      project_id: projectId,
      kind: "optimizer",
      title: ins.title,
      body: ins.body,
      evidence: { metric: ins.metric ?? null, videoCount: rows.length },
      proposed_template_kind: ins.proposedTemplateKind ?? null,
      proposed_template_body: ins.proposedTemplateBody ?? null,
    });
    created += 1;
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
