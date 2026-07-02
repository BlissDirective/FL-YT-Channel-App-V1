import "server-only";
import { embedText, isEmbeddingsLive } from "@/lib/adapters/embeddings";

/**
 * Tier 3 — local lexical near-duplicate detection. "Reused content" is the #1
 * young-channel ban risk, and the previous dedup was an exact normalized-title
 * match (any rewording slipped through). This compares a candidate against the
 * FULL catalog using token + character-trigram Jaccard similarity — no embeddings
 * provider or pgvector needed. It catches rewordings ("10 AI Tools" vs "Ten AI
 * Tools You Need"); pure semantic paraphrases with no shared wording can still
 * pass (that's the trade-off of staying dependency-free).
 */

/** Similarity at/above which two titles are treated as near-duplicates. */
export const DEDUP_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "your",
  "you", "is", "are", "this", "that", "how", "why", "what", "best", "top",
]);

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

function trigramSet(s: string): Set<string> {
  const norm = s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= norm.length; i++) grams.add(norm.slice(i, i + 3));
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 0–1 similarity between two short strings (max of token- and trigram-Jaccard). */
export function titleSimilarity(a: string, b: string): number {
  return Math.max(jaccard(tokenSet(a), tokenSet(b)), jaccard(trigramSet(a), trigramSet(b)));
}

/** The closest existing entry at/above `threshold`, or null. */
export function findNearDuplicate(
  candidate: string,
  existing: string[],
  threshold: number = DEDUP_THRESHOLD,
): { title: string; score: number } | null {
  let best: { title: string; score: number } | null = null;
  for (const title of existing) {
    if (!title) continue;
    const score = titleSimilarity(candidate, title);
    if (score >= threshold && (!best || score > best.score)) best = { title, score };
  }
  return best;
}

/** Cosine similarity at/above which two idea embeddings are near-duplicates.
    (Real embeddings; the hash fallback rarely reaches this, by design —
    the lexical gate still runs first either way.) */
export const SEMANTIC_DEDUP_THRESHOLD = 0.86;

type RpcDb = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/**
 * Semantic near-duplicate lookup against a project's embedded ideas
 * (pgvector `match_ideas`). Returns the closest match at/above threshold,
 * or null. Best-effort: any RPC/adapter failure returns null (the lexical
 * gate remains the floor).
 */
export async function findSemanticDuplicate(
  db: RpcDb,
  projectId: string,
  text: string,
  threshold: number = SEMANTIC_DEDUP_THRESHOLD,
): Promise<{ title: string; score: number } | null> {
  try {
    const { vector } = await embedText(text);
    const { data, error } = await db.rpc("match_ideas", {
      p_project: projectId,
      p_embedding: JSON.stringify(vector),
      p_count: 3,
    });
    if (error) return null;
    const rows = (data ?? []) as { title: string; similarity: number }[];
    const best = rows.find((r) => Number(r.similarity) >= threshold);
    return best ? { title: best.title, score: Number(best.similarity) } : null;
  } catch {
    return null;
  }
}

export { isEmbeddingsLive };
