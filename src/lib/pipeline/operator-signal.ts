import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeMemory } from "@/lib/pipeline/memory-service";
import type { MemoryNamespace } from "@/lib/pipeline/memory";

/**
 * Operator-signal learning (Fable-5-Director-Mode-Build-Spec.md §7.2, D6).
 *
 * In Director Mode every button press logs an `operator_decisions` row with the
 * agent's score/verdict at decision time. This module mines *recurring*
 * disagreements between the operator and the judges and turns them into memory
 * lessons — so the judges/generators calibrate to the operator's taste over
 * time. The mining function is PURE and unit-tested; the DB read/write lives in
 * `runOperatorSignalMining`. Lessons are written as SHADOW (non-gating) and
 * obey the existing evidence-gated + decay governance (memory.ts) — no new
 * memory mechanics.
 */

export type DirectorStageKey = "idea" | "script" | "visuals" | "edit" | "publish";

/** The subset of an operator_decisions row the miner needs. */
export type MinedDecision = {
  stage: DirectorStageKey;
  action: string;
  agent_score: number | null;
  agent_verdict: "pass" | "fail" | null;
};

export type MinedLesson = {
  namespace: MemoryNamespace;
  stage: DirectorStageKey;
  text: string;
  evidence: string;
  count: number;
};

/** Console stage → the memory namespace its lessons belong in. */
const STAGE_NAMESPACE: Record<DirectorStageKey, MemoryNamespace> = {
  idea: "idea",
  script: "script",
  visuals: "visual",
  edit: "editing",
  publish: "packaging",
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Mine recurring operator/judge divergences from a video's (or project's)
 * decisions. Two patterns, each requiring `minEvidence` occurrences in a stage:
 *
 *  A. Advanced/published artifacts the judge FAILED (operator tolerates lower):
 *     the stage floor may over-reject for this channel.
 *  B. Re-rendered artifacts that PASSED the judge (operator's bar is higher):
 *     the generator is missing the operator's bar for this stage.
 *
 * Pure — no I/O. Returns at most one lesson per (pattern × stage).
 */
export function mineOperatorSignal(
  decisions: MinedDecision[],
  minEvidence = 3,
): MinedLesson[] {
  const lessons: MinedLesson[] = [];
  const stages: DirectorStageKey[] = ["idea", "script", "visuals", "edit", "publish"];

  for (const stage of stages) {
    const inStage = decisions.filter((d) => d.stage === stage && d.agent_score != null);

    // Pattern A — advanced/published below the floor.
    const belowAdvances = inStage.filter(
      (d) => (d.action === "advance" || d.action === "publish") && d.agent_verdict === "fail",
    );
    if (belowAdvances.length >= minEvidence) {
      const a = r1(avg(belowAdvances.map((d) => d.agent_score as number)));
      lessons.push({
        namespace: STAGE_NAMESPACE[stage],
        stage,
        text: `Operator repeatedly advances ${stage} work the judge fails (avg ${a}/10, ${belowAdvances.length}×). The ${stage} QC floor likely over-rejects for this channel — weight the operator's calls.`,
        evidence: `${belowAdvances.length} operator advances below floor (avg ${a})`,
        count: belowAdvances.length,
      });
    }

    // Pattern B — re-rendered despite passing.
    const rerenderedPass = inStage.filter(
      (d) => d.action === "rerender" && d.agent_verdict === "pass",
    );
    if (rerenderedPass.length >= minEvidence) {
      const a = r1(avg(rerenderedPass.map((d) => d.agent_score as number)));
      lessons.push({
        namespace: STAGE_NAMESPACE[stage],
        stage,
        text: `Operator repeatedly re-renders ${stage} work that passed QC (avg ${a}/10, ${rerenderedPass.length}×). The ${stage} generator is missing the operator's bar — raise the target for this channel.`,
        evidence: `${rerenderedPass.length} operator re-renders despite passing QC (avg ${a})`,
        count: rerenderedPass.length,
      });
    }
  }
  return lessons;
}

type Db = ReturnType<typeof createAdminClient>;

/**
 * Read every director project's decision ledger, mine per project, and write
 * the resulting lessons to the shared memory as SHADOW entries (non-gating,
 * evidence-gated). Runs on the daily intelligence cadence. Read-only over the
 * autonomous pipeline — it only reads `operator_decisions` (which autonomous
 * flows never write) and writes memory, so it is safe to run for every project.
 */
export async function runOperatorSignalMining(
  dbArg?: Db,
  minEvidence = 3,
): Promise<{ projects: number; lessons: number }> {
  const db = dbArg ?? createAdminClient();
  // operator_decisions only exist for director projects (autonomous flows never
  // write them), so a plain scan is already correctly scoped.
  const { data: rows } = await db
    .from("operator_decisions")
    .select("project_id, stage, action, agent_score, agent_verdict")
    .order("created_at", { ascending: false })
    .limit(2000);

  const byProject = new Map<string, MinedDecision[]>();
  for (const r of (rows ?? []) as (MinedDecision & { project_id: string })[]) {
    const list = byProject.get(r.project_id) ?? [];
    list.push({ stage: r.stage, action: r.action, agent_score: r.agent_score, agent_verdict: r.agent_verdict });
    byProject.set(r.project_id, list);
  }

  let lessonCount = 0;
  for (const [projectId, decisions] of byProject) {
    const lessons = mineOperatorSignal(decisions, minEvidence);
    for (const lesson of lessons) {
      await writeMemory(db, {
        namespace: lesson.namespace,
        text: lesson.text,
        evidence: lesson.evidence,
        scope: { tier: "channel", projectId },
        confidence: 0.3,
        status: "shadow",
      });
      lessonCount++;
    }
  }
  return { projects: byProject.size, lessons: lessonCount };
}

/**
 * Taste calibration (§7.3) — the operator's empirical acceptance threshold for
 * a stage: the lowest score they advanced/published at, once there are enough
 * scored advances to be meaningful. Pure; drives the console's advisory line.
 * Returns null below `minDecisions` scored advances.
 */
export function tasteThreshold(
  decisions: MinedDecision[],
  stage: DirectorStageKey,
  minDecisions = 5,
): { threshold: number; count: number } | null {
  const scored = decisions
    .filter(
      (d) =>
        d.stage === stage &&
        (d.action === "advance" || d.action === "publish") &&
        typeof d.agent_score === "number",
    )
    .map((d) => d.agent_score as number);
  if (scored.length < minDecisions) return null;
  return { threshold: r1(Math.min(...scored)), count: scored.length };
}
