/**
 * Free-corpus documentary retrieval (OpenMontage Remixed list1 #14).
 *
 * Real motion b-roll from Archive.org / Wikimedia / Pexels, selected by
 * CLIP-style relevance to the beat — no paid video API. The pure ranker scores
 * candidate clips against a beat query so the best free clip wins; the adapter
 * fetches candidates. Feeds the router's new `free_footage` medium and boosts
 * grounding (real motion, not just stills).
 *
 * Pure — the CLIP embedding + retrieval happen in the adapter; this ranks the
 * returned candidates deterministically for the unit tests.
 */

export type FootageCorpus = "archive" | "wikimedia" | "pexels";

export type FootageCandidate = {
  id: string;
  corpus: FootageCorpus;
  title: string;
  url: string;
  durationSec: number;
  /** License string — only openly-licensed clips are eligible. */
  license: string;
  /** Keyword tags describing the clip (a stand-in for the CLIP embedding). */
  tags: string[];
  /** 0..1 CLIP similarity to the query when the adapter computed it. */
  clipScore?: number;
};

export type FootageRanking = {
  candidate: FootageCandidate;
  score: number;
  reasons: string[];
};

const OPEN_LICENSE = /public domain|cc0|cc-by|creative commons|pdm|no known copyright|pexels/i;

/** Is a candidate safe to use (openly licensed + long enough)? Pure. */
export function isEligible(c: FootageCandidate, minSec = 2): boolean {
  return OPEN_LICENSE.test(c.license) && c.durationSec >= minSec;
}

/** Tokenise a beat query / clip tags for the keyword-overlap fallback. */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/**
 * Rank eligible candidates against a beat query. Prefers the adapter's CLIP
 * score when present; otherwise falls back to keyword overlap. Corpus priors
 * (archive/wikimedia are documentary-grade) gently break ties. Pure.
 */
export function rankFreeFootage(query: string, candidates: FootageCandidate[]): FootageRanking[] {
  const q = tokens(query);
  const corpusPrior: Record<FootageCorpus, number> = { archive: 0.06, wikimedia: 0.05, pexels: 0.03 };
  return candidates
    .filter((c) => isEligible(c))
    .map((c) => {
      const reasons: string[] = [];
      let score: number;
      if (typeof c.clipScore === "number") {
        score = c.clipScore;
        reasons.push(`CLIP ${c.clipScore.toFixed(2)}`);
      } else {
        const overlap = c.tags.filter((t) => q.has(t.toLowerCase())).length;
        score = Math.min(1, overlap / Math.max(1, q.size));
        reasons.push(`${overlap} tag match(es)`);
      }
      score = Math.min(1, score + corpusPrior[c.corpus]);
      reasons.push(`${c.corpus}, ${c.license}`);
      return { candidate: c, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** The single best free clip for a beat, or null when nothing eligible. Pure. */
export function bestFreeFootage(query: string, candidates: FootageCandidate[]): FootageRanking | null {
  return rankFreeFootage(query, candidates)[0] ?? null;
}
