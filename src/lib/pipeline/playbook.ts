import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryMemory, writeMemory } from "@/lib/pipeline/memory-service";
import { recurringIssues, type MemoryNamespace } from "@/lib/pipeline/memory";

/**
 * C4 playbook — now a thin compatibility shim over the C8 Studio Memory Service
 * (Fable5-Agentic-Harness-Plan.md §C8). Lessons live in `memory_entries`
 * (channel-scoped), governed by the uncapped + top-k + decay/pin model in
 * memory.ts. The public API here is preserved so existing callers (engine,
 * autofix, optimizer) are unchanged; the governance moved underneath them.
 *
 * The `projects.playbook` JSON column is retained as a rollback path (the C8
 * migration backfilled its contents into `memory_entries`); this shim no longer
 * reads or writes it.
 */

type Db = ReturnType<typeof createAdminClient>;

/** The playbook's stages map 1:1 onto memory namespaces. */
export type PlaybookStage = Extract<MemoryNamespace, "idea" | "script" | "visual" | "packaging">;

/**
 * Legacy shape of a bullet as stored in `projects.playbook` (kept for the
 * retained column + `db/types.ts`). New writes go to `memory_entries`.
 */
export type PlaybookEntry = {
  id: string;
  stage: PlaybookStage;
  text: string;
  confidence: number;
  evidence: string;
  evidenceCount: number;
  createdAt: string;
  lastConfirmedAt: string;
};

/** Record an evidence-backed lesson for a stage (channel-scoped). */
export async function recordLesson(
  db: Db,
  projectId: string,
  candidate: { stage: PlaybookStage; text: string; evidence: string; confidence?: number },
): Promise<void> {
  await writeMemory(db, {
    namespace: candidate.stage,
    text: candidate.text,
    evidence: candidate.evidence,
    confidence: candidate.confidence,
    scope: { tier: "channel", projectId },
  });
}

/** The top confident lessons for a stage, for prompt injection (global ∪ channel). */
export async function playbookForStage(
  db: Db,
  projectId: string,
  stage: PlaybookStage,
  k = 5,
): Promise<string[]> {
  const hits = await queryMemory(db, { namespace: stage, projectId, k });
  return hits.map((h) => h.text);
}

/**
 * Reflector/Curator for the script stage (Harness C4): a QC issue that recurs
 * across multiple scripts is a real, evidence-backed pattern — promote it to a
 * governed lesson. Evidence = the recurrence count; confidence scales with it.
 */
export async function curateScriptLessons(db: Db, projectId: string): Promise<{ promoted: number }> {
  const { data: vids } = await db.from("videos").select("id").eq("project_id", projectId);
  const ids = ((vids ?? []) as { id: string }[]).map((v) => v.id);
  if (ids.length < 3) return { promoted: 0 };
  const { data: revs } = await db
    .from("qc_reviews")
    .select("issues, score")
    .in("video_id", ids)
    .eq("gate", "SCRIPT")
    .order("created_at", { ascending: false })
    .limit(40);
  const allIssues = ((revs ?? []) as { issues: string[] }[]).flatMap((r) => r.issues ?? []);
  const recurring = recurringIssues(allIssues, 3).slice(0, 5);
  let promoted = 0;
  for (const r of recurring) {
    await recordLesson(db, projectId, {
      stage: "script",
      text: `Recurring script issue — pre-empt it: ${r.text}`,
      evidence: `flagged on ${r.count} scripts`,
      confidence: Math.min(0.6, 0.3 + r.count * 0.05),
    });
    promoted += 1;
  }
  return { promoted };
}
