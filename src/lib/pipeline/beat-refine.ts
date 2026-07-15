import "server-only";

/**
 * Visual Craft Engine V3 — the per-beat refine loop.
 *
 * When a generated shot scores below the relevance/quality floor, don't blindly
 * re-roll — feed the critic's SPECIFIC complaint back into the prompt (a
 * targeted rewrite that keeps the Visual-Bible conditioning) and re-roll, then
 * re-score. Bounded by attempts + a per-beat spend cap, and CHEAP-FIRST: only
 * the still is refined here, so a beat is only ever animated (paid i2v) from a
 * still that already cleared the floor.
 *
 * The orchestrator takes its critic + reroll functions by injection, so the
 * whole loop is unit-testable with mocks and the engine wiring stays thin.
 */

export type RefineConfig = {
  /** Score floor a shot must reach to stop refining. */
  floor: number;
  /** Max targeted rewrites per beat. */
  maxAttempts: number;
  /** Per-beat spend cap (USD) for the refine loop. */
  spendCapUsd: number;
};

export const DEFAULT_REFINE: RefineConfig = { floor: 6, maxAttempts: 2, spendCapUsd: 0.25 };

/** Pure: keep refining? Below floor AND within the attempt + spend budget. */
export function shouldRefine(
  score: number,
  attempts: number,
  spentUsd: number,
  cfg: RefineConfig,
): boolean {
  return score < cfg.floor && attempts < cfg.maxAttempts && spentUsd < cfg.spendCapUsd;
}

/**
 * Pure: merge the critic's note into the prompt as a targeted fix. Preserves the
 * existing prompt (which already carries the Visual-Bible conditioning) and
 * de-duplicates a repeated fix so successive attempts don't stack the same clause.
 */
export function nextPrompt(prompt: string, criticNote: string): string {
  const note = criticNote.trim().replace(/\s+/g, " ");
  if (!note) return prompt;
  // Strip any prior "Fix:" clause so attempts replace rather than accumulate.
  const base = prompt.replace(/\s*Fix:.*$/s, "").trim();
  return `${base} Fix: ${note}`;
}

export type RefineCritique = { score: number; note: string };
export type RefineAttempt = {
  attempt: number;
  fromScore: number;
  toScore: number;
  criticNote: string;
  promptBefore: string;
  promptAfter: string;
  costUsd: number;
};
export type RefineResult = {
  finalScore: number;
  finalPrompt: string;
  attempts: RefineAttempt[];
  spentUsd: number;
  improved: boolean;
};

/**
 * Run the bounded, cheap-first refine loop for one shot.
 *  - `critique(prompt)` → the critic's score + specific note for the current art.
 *  - `reroll(prompt)`   → regenerate the still with the rewritten prompt; returns cost.
 * Both are injected so this is testable and the engine can pass real adapters.
 */
export async function refineBeatVisual(opts: {
  initialPrompt: string;
  initialScore: number;
  initialNote: string;
  cfg?: RefineConfig;
  critique: (prompt: string) => Promise<RefineCritique>;
  reroll: (prompt: string) => Promise<{ costUsd: number }>;
}): Promise<RefineResult> {
  const cfg = opts.cfg ?? DEFAULT_REFINE;
  let prompt = opts.initialPrompt;
  let score = opts.initialScore;
  let note = opts.initialNote;
  let spent = 0;
  let attemptN = 0;
  const attempts: RefineAttempt[] = [];

  while (shouldRefine(score, attemptN, spent, cfg)) {
    attemptN += 1;
    const promptBefore = prompt;
    const promptAfter = nextPrompt(prompt, note);
    const { costUsd } = await opts.reroll(promptAfter);
    spent += costUsd;
    const fresh = await opts.critique(promptAfter);
    attempts.push({
      attempt: attemptN,
      fromScore: score,
      toScore: fresh.score,
      criticNote: note,
      promptBefore,
      promptAfter,
      costUsd,
    });
    prompt = promptAfter;
    score = fresh.score;
    note = fresh.note;
  }

  return {
    finalScore: score,
    finalPrompt: prompt,
    attempts,
    spentUsd: Math.round(spent * 1000) / 1000,
    improved: score > opts.initialScore,
  };
}
