import type { CaptionPage, EditDocument, Emphasis } from "./edd";

/**
 * Auto-emphasis pass (MVDA Phase D, plan §1 "LLM emphasis pass" — the
 * deterministic tier). Tags the caption tokens that carry the hook with a
 * kinetic emphasis so captions pop TikTok-style at scale, without an LLM
 * call per video: numbers pop, money/percent scale, power words color.
 *
 * Deliberately sparse — at most one emphasized token per page, hard total
 * cap — because emphasis density is exactly what the lint (edd-lint.ts)
 * flags as amateur. The agent (set_emphasis) and the human (/edit) refine
 * on top; this pass never overwrites a page that already has ANY authored
 * emphasis, so it is safe to run on any document at any time.
 *
 * NOT applied by the legacy compiler (compileEdd stays faithful — an
 * unedited v1 must render ≡ the pre-EDD output). It runs as an explicit
 * versioned edit: the agent's `auto_emphasis` tool, or a future /edit action.
 */

/** Words that carry persuasion weight in faceless-channel narration. */
const POWER_WORDS = new Set([
  "never", "always", "only", "secret", "secrets", "free", "new", "proven",
  "best", "worst", "biggest", "smallest", "fastest", "slowest", "richest",
  "poorest", "first", "last", "every", "everyone", "nobody", "nothing",
  "everything", "impossible", "guaranteed", "banned", "hidden", "truth",
  "lie", "lies", "mistake", "mistakes", "warning", "danger", "dangerous",
  "shocking", "insane", "crazy", "massive", "tiny", "instantly", "forever",
]);

const clean = (t: string) => t.toLowerCase().replace(/[^a-z0-9%$.]/g, "");

/** Classify one token; null = not emphasis-worthy. */
export function classifyToken(text: string): Emphasis | null {
  const t = clean(text);
  if (!t) return null;
  if (/[%$]/.test(text)) return "scale"; // money & percentages scale up
  if (/^\d/.test(t)) return "pop"; // bare numbers pop
  if (POWER_WORDS.has(t.replace(/[.%$]/g, ""))) return "color"; // power words recolor
  return null;
}

export type EmphasisPick = { pageIdx: number; tokenIdx: number; emphasis: Emphasis };

/**
 * Choose emphasis picks for a document's caption pages. Pure + deterministic:
 * same doc in, same picks out. Skips pages with any existing emphasis.
 */
export function pickAutoEmphasis(
  pages: CaptionPage[],
  opts: { maxTotal?: number } = {},
): EmphasisPick[] {
  const maxTotal = opts.maxTotal ?? 10;
  const picks: EmphasisPick[] = [];
  for (let p = 0; p < pages.length && picks.length < maxTotal; p++) {
    const page = pages[p];
    if (page.tokens.some((t) => t.emphasis !== "none")) continue; // authored — hands off
    // First qualifying token wins; numbers beat power words when both appear.
    let best: { tokenIdx: number; emphasis: Emphasis; rank: number } | null = null;
    for (let i = 0; i < page.tokens.length; i++) {
      const e = classifyToken(page.tokens[i].text);
      if (!e) continue;
      const rank = e === "scale" ? 0 : e === "pop" ? 1 : 2;
      if (!best || rank < best.rank) best = { tokenIdx: i, emphasis: e, rank };
      if (best.rank === 0) break;
    }
    if (best) picks.push({ pageIdx: p, tokenIdx: best.tokenIdx, emphasis: best.emphasis });
  }
  return picks;
}

/** Apply the auto-emphasis pass to a document (immutably). */
export function autoEmphasis(doc: EditDocument, opts: { maxTotal?: number } = {}): {
  doc: EditDocument;
  picks: EmphasisPick[];
} {
  const picks = pickAutoEmphasis(doc.tracks.captions, opts);
  if (picks.length === 0) return { doc, picks };
  const d: EditDocument = JSON.parse(JSON.stringify(doc));
  for (const pick of picks) {
    const tok = d.tracks.captions[pick.pageIdx]?.tokens[pick.tokenIdx];
    if (tok) tok.emphasis = pick.emphasis;
  }
  return { doc: d, picks };
}
