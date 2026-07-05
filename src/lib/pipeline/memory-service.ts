import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText } from "@/lib/adapters/embeddings";
import { keywords } from "@/lib/pipeline/dedup";
import {
  decayedConfidence,
  isSameLesson,
  planGlobalPromotion,
  planGraduation,
  RETIRE_FLOOR,
  TECHNIQUE_NAMESPACES,
  topByConfidence,
  type ChannelLesson,
  type MemoryEntry,
  type MemoryNamespace,
  type MemoryStatus,
} from "@/lib/pipeline/memory";

/**
 * Studio Memory Service — DB-facing read/write (Harness C8). The hot-path
 * retrieval is a cheap, deterministic tool: no LLM in `queryMemory`. Semantic
 * recall runs through the `match_memory` pgvector RPC; if embeddings/RPC are
 * unavailable it degrades to a lexical rank — never throws into the caller.
 *
 * Two-tier scope is enforced in the RPC and the fallback query alike: a channel
 * lookup returns `global:craft ∪ channel:X`, never another channel's rows.
 */

type Db = ReturnType<typeof createAdminClient>;

export type MemoryScope = { tier: "global" } | { tier: "channel"; projectId: string };

export type MemoryHit = {
  id: string;
  text: string;
  confidence: number;
  similarity: number;
  tier?: string;
};

type Row = {
  id: string;
  namespace: string;
  text: string;
  confidence: number;
  evidence: string;
  evidence_count: number;
  pinned: boolean;
  status: string;
  tier: string;
  created_at: string;
  last_confirmed_at: string;
};

function rowToEntry(r: Row): MemoryEntry {
  return {
    id: r.id,
    namespace: r.namespace as MemoryNamespace,
    text: r.text,
    confidence: Number(r.confidence),
    evidence: r.evidence,
    evidenceCount: r.evidence_count,
    pinned: r.pinned,
    status: r.status as MemoryStatus,
    createdAt: r.created_at,
    lastConfirmedAt: r.last_confirmed_at,
  };
}

/** Load the active (+ optionally shadow) rows visible to one channel. */
async function loadScoped(db: Db, namespace: MemoryNamespace, projectId: string): Promise<MemoryEntry[]> {
  const { data } = await db
    .from("memory_entries")
    .select(
      "id, namespace, text, confidence, evidence, evidence_count, pinned, status, tier, created_at, last_confirmed_at",
    )
    .eq("namespace", namespace)
    .or(`tier.eq.global,project_id.eq.${projectId}`)
    .neq("status", "retired")
    .limit(2000);
  return ((data ?? []) as Row[]).map(rowToEntry);
}

/** Lexical rank fallback (no embeddings / RPC): keyword overlap × decayed confidence. */
async function lexicalQuery(
  db: Db,
  namespace: MemoryNamespace,
  projectId: string,
  query: string,
  now: string,
  k: number,
  includeShadow: boolean,
): Promise<MemoryHit[]> {
  const entries = await loadScoped(db, namespace, projectId);
  const qk = new Set(keywords(query));
  return entries
    .filter((e) => e.status === "active" || (includeShadow && e.status === "shadow"))
    .map((e) => {
      const ek = new Set(keywords(e.text));
      let inter = 0;
      for (const w of qk) if (ek.has(w)) inter++;
      const lex = qk.size ? inter / qk.size : 0;
      // Blend lexical overlap with decayed confidence so a strong lesson still
      // surfaces even when its wording doesn't overlap the query.
      const score = lex * 0.7 + decayedConfidence(e, now) * 0.3;
      return { e, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ e, score }) => ({ id: e.id, text: e.text, confidence: e.confidence, similarity: score }));
}

/**
 * Retrieve memory for one channel. With a `query`, runs semantic recall
 * (`match_memory` → lexical fallback). Without a query, returns the top lessons
 * by decayed confidence — the prompt-prefix mode the C4 playbook used.
 */
export async function queryMemory(
  db: Db,
  opts: {
    namespace: MemoryNamespace;
    projectId: string; // the channel doing the lookup; global rows are always included
    query?: string;
    k?: number;
    includeShadow?: boolean;
  },
): Promise<MemoryHit[]> {
  const k = opts.k ?? 8;
  const includeShadow = opts.includeShadow ?? false;
  const now = new Date().toISOString();
  const query = opts.query?.trim();
  try {
    if (query) {
      const { vector } = await embedText(query);
      const { data, error } = await db.rpc("match_memory", {
        p_namespace: opts.namespace,
        p_embedding: JSON.stringify(vector),
        p_project: opts.projectId,
        p_count: k,
        p_include_shadow: includeShadow,
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as MemoryHit[]).map((h) => ({
          id: h.id,
          text: h.text,
          confidence: Number(h.confidence),
          similarity: Number(h.similarity),
          tier: h.tier,
        }));
      }
      return await lexicalQuery(db, opts.namespace, opts.projectId, query, now, k, includeShadow);
    }
    // Confidence-only mode (e.g. stage lessons for prompt injection).
    const entries = await loadScoped(db, opts.namespace, opts.projectId);
    return topByConfidence(entries, opts.namespace, now, k, includeShadow).map((e) => ({
      id: e.id,
      text: e.text,
      confidence: e.confidence,
      similarity: 1,
    }));
  } catch {
    return [];
  }
}

/**
 * Governed write: reinforces a matching lesson in the same namespace + exact
 * scope, else inserts a new (embedded) row. Evidence-gated; best-effort and
 * non-fatal — a memory write must never break the pipeline. Global-tier writes
 * are the librarian's promotion path; hot-path callers pass a channel scope.
 */
export async function writeMemory(
  db: Db,
  opts: {
    namespace: MemoryNamespace;
    text: string;
    evidence: string;
    scope: MemoryScope;
    confidence?: number;
    kind?: "lesson" | "criterion";
    status?: MemoryStatus;
  },
): Promise<void> {
  const text = opts.text.trim();
  const evidence = opts.evidence.trim();
  if (!text || !evidence) return; // evidence-gated

  try {
    const projectId = opts.scope.tier === "channel" ? opts.scope.projectId : null;
    let sel = db
      .from("memory_entries")
      .select("id, text, confidence, evidence_count, status")
      .eq("namespace", opts.namespace)
      .eq("tier", opts.scope.tier);
    sel = projectId === null ? sel.is("project_id", null) : sel.eq("project_id", projectId);
    const { data } = await sel.limit(500);
    const rows = (data ?? []) as {
      id: string;
      text: string;
      confidence: number;
      evidence_count: number;
      status: string;
    }[];
    const now = new Date().toISOString();

    const match = rows.find((r) => isSameLesson(r.text, text));
    if (match) {
      const confidence = Math.min(1, Number(match.confidence) + (1 - Number(match.confidence)) * 0.34);
      const patch: Record<string, unknown> = {
        evidence_count: match.evidence_count + 1,
        confidence,
        evidence,
        last_confirmed_at: now,
      };
      if (match.status === "retired") patch.status = "active";
      await db.from("memory_entries").update(patch).eq("id", match.id);
      return;
    }

    // New row — embed for semantic retrieval (best-effort; mock vector otherwise).
    let embedding: string | null = null;
    let embeddingModel: string | null = null;
    try {
      const e = await embedText(text);
      embedding = JSON.stringify(e.vector);
      embeddingModel = e.model;
    } catch {
      /* embedding is an enhancement — never block the write */
    }
    await db.from("memory_entries").insert({
      tier: opts.scope.tier,
      project_id: projectId,
      namespace: opts.namespace,
      kind: opts.kind ?? "lesson",
      status: opts.status ?? "active",
      text,
      evidence,
      evidence_count: 1,
      confidence: opts.confidence ?? 0.34,
      embedding,
      embedding_model: embeddingModel,
      last_confirmed_at: now,
    });
  } catch (err) {
    console.error("memory write failed (non-fatal):", err);
  }
}

/**
 * Uniform channel-scoped read/write for ANY namespace (C8 "equal depth") — the
 * one-line API every agent uses. `idea`/`script`/`visual`/`packaging` also have
 * the playbook shim; `audio`/`editing`/`competitive`/`outcome`/`quality` use
 * these directly. Reads include the shared global-craft tier automatically.
 */
export async function recordNamespaceLesson(
  db: Db,
  projectId: string,
  namespace: MemoryNamespace,
  lesson: { text: string; evidence: string; confidence?: number; status?: MemoryStatus },
): Promise<void> {
  await writeMemory(db, {
    namespace,
    text: lesson.text,
    evidence: lesson.evidence,
    confidence: lesson.confidence,
    status: lesson.status,
    scope: { tier: "channel", projectId },
  });
}

export async function namespaceLessons(
  db: Db,
  projectId: string,
  namespace: MemoryNamespace,
  opts?: { query?: string; k?: number },
): Promise<string[]> {
  const hits = await queryMemory(db, { namespace, projectId, query: opts?.query, k: opts?.k ?? 6 });
  return hits.map((h) => h.text);
}

/**
 * Run the shadow→graduate lifecycle for one channel's `quality` lessons (C8).
 * Called nightly from the outcome-audit pass: shadow lessons that keep recurring
 * graduate to gating ("active"); ones that faded retire. Best-effort.
 */
export async function runQualityGraduation(
  db: Db,
  projectId: string,
  cfg: { shadowMinEvidence: number; autoGraduateConfidence: number },
): Promise<{ promoted: number; retired: number }> {
  try {
    const { data } = await db
      .from("memory_entries")
      .select("id, namespace, text, confidence, evidence, evidence_count, pinned, status, tier, created_at, last_confirmed_at")
      .eq("namespace", "quality")
      .eq("tier", "channel")
      .eq("project_id", projectId)
      .eq("status", "shadow")
      .limit(2000);
    const entries = ((data ?? []) as Row[]).map(rowToEntry);
    if (entries.length === 0) return { promoted: 0, retired: 0 };

    const { promote, retire } = planGraduation(entries, cfg, new Date().toISOString());
    if (promote.length > 0) await db.from("memory_entries").update({ status: "active" }).in("id", promote);
    if (retire.length > 0) await db.from("memory_entries").update({ status: "retired" }).in("id", retire);
    return { promoted: promote.length, retired: retire.length };
  } catch (err) {
    console.error("quality graduation failed (non-fatal):", err);
    return { promoted: 0, retired: 0 };
  }
}

/**
 * The C8 librarian — a nightly cross-channel curation pass (Fable5-Self-Watch-
 * Loop-Plan.md / Harness §C8). Deterministic and best-effort:
 *  1. Global-craft promotion: technique lessons confirmed on ≥ `minChannels`
 *     distinct channels graduate to the shared `global:craft` tier.
 *  2. Retire sweep: active channel lessons whose confidence decayed below the
 *     floor (and aren't pinned) retire, keeping the store fresh.
 * Runs once per night (not per project). LLM cross-cutting synthesis is a
 * documented future increment; the promotion + hygiene are pure and testable.
 */
export async function runLibrarian(
  db: Db,
  opts?: { minChannels?: number },
): Promise<{ promotedGlobal: number; retired: number }> {
  const minChannels = opts?.minChannels ?? 3;
  try {
    // Load active channel-scoped lessons in the technique namespaces (promotable).
    const { data: techRows } = await db
      .from("memory_entries")
      .select("id, namespace, text, project_id, pinned, confidence, last_confirmed_at")
      .in("namespace", TECHNIQUE_NAMESPACES)
      .eq("tier", "channel")
      .eq("status", "active")
      .limit(5000);
    const rows = (techRows ?? []) as {
      id: string;
      namespace: string;
      text: string;
      project_id: string;
      pinned: boolean;
      confidence: number;
      last_confirmed_at: string;
    }[];

    // 1) Global-craft promotion.
    const lessons: ChannelLesson[] = rows.map((r) => ({ namespace: r.namespace as MemoryNamespace, text: r.text, projectId: r.project_id }));
    const { data: globalRows } = await db
      .from("memory_entries")
      .select("namespace, text")
      .eq("tier", "global")
      .neq("status", "retired")
      .limit(5000);
    const existingGlobal = ((globalRows ?? []) as { namespace: string; text: string }[]).map((g) => ({
      namespace: g.namespace as MemoryNamespace,
      text: g.text,
    }));
    const promotions = planGlobalPromotion(lessons, existingGlobal, minChannels);
    for (const p of promotions) {
      await writeMemory(db, {
        namespace: p.namespace,
        text: p.text,
        evidence: p.evidence,
        scope: { tier: "global" },
        confidence: 0.6,
      });
    }

    // 2) Retire sweep across active channel lessons that decayed out.
    const now = new Date().toISOString();
    const retire = rows
      .filter((r) => !r.pinned && decayedConfidence({ confidence: Number(r.confidence), lastConfirmedAt: r.last_confirmed_at, pinned: false }, now) < RETIRE_FLOOR)
      .map((r) => r.id);
    if (retire.length > 0) await db.from("memory_entries").update({ status: "retired" }).in("id", retire);

    return { promotedGlobal: promotions.length, retired: retire.length };
  } catch (err) {
    console.error("librarian pass failed (non-fatal):", err);
    return { promotedGlobal: 0, retired: 0 };
  }
}
