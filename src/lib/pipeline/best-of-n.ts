/**
 * Best-of-N selection harness (Harness C2, Fable5-Agentic-Harness-Plan.md).
 *
 * Round-robin pairwise selection with order-swap — the research-backed default
 * for choosing among a few creative variants (N≤5, no bracket needed). Each
 * unordered pair is judged in BOTH orders and averaged, so position bias can't
 * decide the winner. The judge is injected (`scorePair`), so this core is pure
 * and unit-testable; the LLM judge lives in variant-judge.ts.
 */

/** scorePair(a, b) → P(a is the better choice than b), in [0, 1]. */
export type PairScorer = (a: string, b: string) => Promise<number>;

export type SelectionResult = {
  winner: string;
  /** Candidates with their average pairwise win-share, best first. */
  ranked: { candidate: string; winShare: number }[];
};

/** Dedup + trim candidates, preserving order (first occurrence wins). */
export function normalizeCandidates(candidates: string[], max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const c = (raw ?? "").trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= max) break;
  }
  return out;
}

export async function selectBest(
  candidates: string[],
  scorePair: PairScorer,
): Promise<SelectionResult | null> {
  const pool = normalizeCandidates(candidates);
  if (pool.length === 0) return null;
  if (pool.length === 1) return { winner: pool[0], ranked: [{ candidate: pool[0], winShare: 1 }] };

  const wins = new Map<string, number>(pool.map((c) => [c, 0]));
  let comparisons = 0;
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      // Judge both orders; average out position bias. A failed judge call
      // returns 0.5 (a tie) so one bad call can't hand the win to either side.
      const [ab, ba] = await Promise.all([safeScore(scorePair, a, b), safeScore(scorePair, b, a)]);
      const aWins = (ab + (1 - ba)) / 2; // share of this pair that goes to a
      wins.set(a, (wins.get(a) ?? 0) + aWins);
      wins.set(b, (wins.get(b) ?? 0) + (1 - aWins));
      comparisons += 1;
    }
  }
  const perCandidateMax = pool.length - 1; // each candidate meets N-1 others
  const ranked = pool
    .map((candidate) => ({ candidate, winShare: (wins.get(candidate) ?? 0) / perCandidateMax }))
    .sort((x, y) => y.winShare - x.winShare);
  void comparisons;
  return { winner: ranked[0].candidate, ranked };
}

async function safeScore(scorePair: PairScorer, a: string, b: string): Promise<number> {
  try {
    const v = await scorePair(a, b);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  } catch {
    return 0.5;
  }
}
