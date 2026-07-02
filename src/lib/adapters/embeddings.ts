import "server-only";

/**
 * Text embeddings for semantic idea dedup (Enhancement Plan Phase 4.7 /
 * Tier 5). Lexical matching catches rewordings; embeddings catch the
 * near-duplicate ANGLES that actually burn a niche ("5 Ways Banks Trick
 * You" vs "The Hidden Fees Costing You Thousands").
 *
 * Live with OPENAI_API_KEY (text-embedding-3-small, 1536-dim — matches the
 * pgvector column). Without a key, a deterministic hashed bag-of-words
 * vector keeps the pipeline flowing end-to-end: it approximates lexical
 * overlap, so mock-mode semantic checks are roughly as strong as the
 * lexical gate (never weaker), and flipping the key on upgrades silently.
 */

export const EMBEDDING_DIM = 1536;

export function isEmbeddingsLive(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function embedText(text: string): Promise<{ vector: number[]; model: string }> {
  const input = text.trim().slice(0, 2000);
  if (!isEmbeddingsLive()) return { vector: mockEmbed(input), model: "mock-hash-v1" };

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input }),
  });
  if (!res.ok) {
    // Degrade to the deterministic mock rather than blocking idea intake.
    console.error(`embeddings API ${res.status} — using hash fallback`);
    return { vector: mockEmbed(input), model: "mock-hash-v1" };
  }
  const data = (await res.json()) as { data: { embedding: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (!vector || vector.length !== EMBEDDING_DIM) {
    return { vector: mockEmbed(input), model: "mock-hash-v1" };
  }
  return { vector, model: "text-embedding-3-small" };
}

/** Deterministic hashed bag-of-words vector, L2-normalized. */
function mockEmbed(text: string): number[] {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = (h >>> 0) % EMBEDDING_DIM;
    v[idx] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Math.round((x / norm) * 1e6) / 1e6);
}
