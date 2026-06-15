import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchNiche } from "@/lib/adapters/youtube";
import { scoreIdeas } from "@/lib/adapters/intelligence";

/**
 * Daily intelligence run (Phase 8). For one project: search its niche for
 * proven videos, have Claude score repurposable ideas, and land the best as
 * fresh idea-stage videos in the review queue — each linked to an idea row
 * carrying the source stats and suggested angle. Idempotent-ish: skips ideas
 * whose title already exists for the project. Uses the service-role client so
 * it runs from the unauthenticated cron.
 */
export async function runIntelligence(
  projectId: string,
  opts: { limit?: number; targetLengthSec?: number } = {},
): Promise<{ created: number }> {
  const limit = opts.limit ?? 3;
  const db = createAdminClient();

  const { data: project } = await db
    .from("projects")
    .select("id, niche, audience, angle, status")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { created: 0 };

  // Search on the niche only — the prose angle makes a noisy YouTube query.
  // The angle still steers Claude's scoring below. Strip punctuation that
  // dilutes the search (em-dashes, commas) down to the core terms.
  const query =
    (project.niche || "trending")
      .replace(/[—–-]/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "trending";
  const candidates = await searchNiche(query, 12);
  if (candidates.length === 0) return { created: 0 };

  const { ideas, costUsd } = await scoreIdeas({
    niche: project.niche ?? "",
    audience: project.audience ?? "",
    angle: project.angle ?? "",
    candidates,
  });

  // Dedupe against existing idea titles for this project.
  const { data: existing } = await db
    .from("ideas")
    .select("title")
    .eq("project_id", projectId);
  const seen = new Set((existing ?? []).map((e) => normalize(e.title)));

  const picks = ideas
    .filter((i) => i.flag !== "SKIP" && !seen.has(normalize(i.title)))
    .slice(0, limit);

  let created = 0;
  for (const idea of picks) {
    const { data: ideaRow } = await db
      .from("ideas")
      .insert({
        project_id: projectId,
        title: idea.title,
        angle: idea.angle,
        score: idea.score,
        flag: idea.flag,
        status: "new",
        source: idea.source,
      })
      .select("id")
      .single();
    if (!ideaRow) continue;
    // Land it in the review queue as an idea-stage video linked to the idea.
    await db.from("videos").insert({
      project_id: projectId,
      idea_id: ideaRow.id,
      title: idea.title,
      topic: idea.source.sourceTitle ?? idea.title,
      format: idea.format,
      status: "IDEA",
      ...(opts.targetLengthSec ? { target_length_sec: opts.targetLengthSec } : {}),
    });
    created += 1;
  }

  if (costUsd > 0) {
    await db.from("cost_ledger").insert({
      project_id: projectId,
      provider: "anthropic",
      description: `Intelligence run — ${created} idea${created === 1 ? "" : "s"}`,
      usd: costUsd,
    });
  }

  return { created };
}

/** Run the intelligence pass for every active project (the nightly cron). */
export async function runIntelligenceAllProjects(): Promise<{ created: number; projects: number }> {
  const db = createAdminClient();
  // Opt-in only: the nightly cron runs for projects that enabled auto-ideas.
  const { data: projects } = await db
    .from("projects")
    .select("id")
    .eq("status", "active")
    .eq("auto_intelligence", true);
  let created = 0;
  for (const p of projects ?? []) {
    const r = await runIntelligence(p.id);
    created += r.created;
  }
  return { created, projects: (projects ?? []).length };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
