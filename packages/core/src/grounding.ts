/**
 * Visual Craft Engine V4 — grounded-generation decision logic (pure).
 *
 * Some beats must look RIGHT — a real product, place, or statistic. For those we
 * seed generation from a real licensed reference instead of a hallucinated
 * still. This module decides WHICH beats want grounding and extracts the entity
 * to search for. Pure — no I/O — so the decision is unit-testable.
 */

import type { ShotIntent } from "./shot-router";

/** Intents whose visual depicts something real → worth grounding in a reference.
    Concept/quote/hero are stylistic and are left to generation. */
export function wantsGrounding(intent: ShotIntent): boolean {
  return intent === "data" || intent === "detail" || intent === "establish";
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "our", "their",
  "about", "over", "under", "then", "than", "them", "they", "what", "when", "where",
  "which", "while", "will", "would", "could", "should", "have", "has", "had", "not",
  "are", "was", "were", "been", "being", "its", "his", "her", "how", "why", "who",
]);

/**
 * Extract the most search-worthy entity/keyword from a beat's text (pure).
 * Prefers a capitalized multi-word proper noun (e.g. "AlphaFold protein"); falls
 * back to the longest salient content word. Returns "" when nothing salient.
 */
export function extractEntity(text: string): string {
  const clean = text.replace(/[^A-Za-z0-9 '-]/g, " ").replace(/\s+/g, " ").trim();
  // Capitalized proper-noun run (2–4 words), ignoring a sentence-initial cap.
  const proper = clean.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\b/g);
  if (proper) {
    // Strip a leading article that only got capitalized by sentence position.
    const stripArticle = (m: string) => m.replace(/^(The|A|An)\s+/, "").trim();
    const strong =
      proper.map(stripArticle).find((m) => m.includes(" ")) ??
      proper.map(stripArticle).find((m, i) => clean.indexOf(proper[i]) > 0 && m.length > 0);
    if (strong) return strong.trim();
  }
  const words = clean.toLowerCase().split(" ").filter((w) => w.length > 4 && !STOPWORDS.has(w));
  if (words.length === 0) return "";
  return words.sort((a, b) => b.length - a.length)[0];
}
