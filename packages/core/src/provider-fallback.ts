/**
 * Provider fallback chains (OpenMontage Remixed list1-#11 + B1).
 *
 * The scored selector (#1) already ranks every candidate model for a beat —
 * winner first, then the alternatives in descending score. That ranking IS the
 * fallback chain: when the primary model fails to generate, the worker walks to
 * the next-best candidate automatically (logging the substitution) instead of
 * hammering the same broken provider. When the whole video chain is exhausted,
 * a terminal cross-medium edge downshifts to a still-with-motion so a beat is
 * never left empty (B1's tool-graph fallback edge).
 *
 * Pure — no I/O — so the walk is deterministic and unit-tested.
 */

/** A selection log (from #1) carries the winner + ranked alternatives. */
export type FallbackSelection = {
  model: string;
  alternatives?: { id: string }[];
};

/** The ordered model chain for a beat: [winner, ...alternatives]. Deduped. */
export function buildFallbackChain(selection: FallbackSelection | null | undefined): string[] {
  if (!selection?.model) return [];
  const chain = [selection.model, ...(selection.alternatives ?? []).map((a) => a.id)];
  return [...new Set(chain.filter(Boolean))];
}

export type FallbackStep = {
  /** The model to run on this attempt. */
  model: string;
  /** 0 = the primary (scored winner); ≥1 = a fallback. */
  fallbackIndex: number;
  /** True when the chain is exhausted and only the terminal edge remains. */
  exhausted: boolean;
  /** The medium to drop to when models are exhausted (B1's tool-graph edge). */
  terminalMedium: "still";
};

/**
 * Which model to run on a given attempt (1-indexed: attempt 1 = primary).
 * Walks the chain, clamping at the last model; once past the chain the step is
 * flagged `exhausted` so the caller can drop to the terminal still medium.
 */
export function fallbackForAttempt(chain: string[], attempt: number): FallbackStep | null {
  if (chain.length === 0) return null;
  const idx = Math.max(0, attempt - 1);
  const clamped = Math.min(idx, chain.length - 1);
  return {
    model: chain[clamped],
    fallbackIndex: clamped,
    exhausted: idx >= chain.length,
    terminalMedium: "still",
  };
}
