/**
 * Studio Memory Service — governance core (Harness C8,
 * Fable5-Agentic-Harness-Plan.md §C8).
 *
 * Generalizes the C4 playbook from per-project prompt-prefix lessons into a
 * namespaced, uncapped, decaying memory shared across every agent. These
 * functions are PURE and unit-tested; the DB I/O lives in memory-service.ts.
 *
 * Governance model (supersedes C4's 40-item cap / hard 90-day expiry):
 *  - WRITE is evidence-gated (no evidence → no write) and REINFORCES a matching
 *    lesson instead of duplicating.
 *  - Storage is UNCAPPED — a high safety ceiling only bounds pathological
 *    growth (applied in the librarian's retire pass, never per write).
 *  - Confidence DECAYS with age since last confirmation and REVIVES on
 *    reconfirmation; retrieval ranks by *decayed* confidence.
 *  - A lesson RETIRES only when its decayed confidence drops below a floor and
 *    it is not pinned. Operator-PINNED lessons never decay or retire.
 */

export type MemoryNamespace =
  | "quality"
  | "idea"
  | "script"
  | "visual"
  | "audio"
  | "editing"
  | "packaging"
  | "competitive"
  | "outcome";

export type MemoryStatus = "active" | "shadow" | "retired";

export type MemoryEntry = {
  id: string;
  namespace: MemoryNamespace;
  /** The lesson, phrased as guidance for the next generation/decision. */
  text: string;
  /** The "confirmed" confidence as of lastConfirmedAt (pre-decay). */
  confidence: number;
  /** How the lesson was earned (e.g. "autofix +1.8 QC", "retention +6%"). */
  evidence: string;
  evidenceCount: number;
  /** Operator-pinned lessons never decay or retire. */
  pinned: boolean;
  status: MemoryStatus;
  createdAt: string;
  lastConfirmedAt: string;
};

/** Slow half-life: a lesson keeps most of its weight for months. */
export const DECAY_HALFLIFE_DAYS = 120;
/** Decayed confidence below this (and unpinned) → the lesson retires. */
export const RETIRE_FLOOR = 0.12;
/** Per namespace/scope backstop against pathological growth (librarian pass). */
export const SAFETY_CAP = 5000;
export const DEFAULT_TOPK = 8;

const DAY_MS = 86_400_000;

/** Loose match: strong word overlap → the same lesson (caller scopes namespace). */
export function isSameLesson(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const wa = new Set(norm(a));
  const wb = new Set(norm(b));
  if (wa.size === 0 || wb.size === 0) return false;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size) >= 0.6;
}

/** Confidence decayed toward 0 by age since last confirmation. Pinned = no decay. */
export function decayedConfidence(
  entry: Pick<MemoryEntry, "confidence" | "lastConfirmedAt" | "pinned">,
  now: string,
): number {
  if (entry.pinned) return entry.confidence;
  const ageDays = Math.max(0, (new Date(now).getTime() - new Date(entry.lastConfirmedAt).getTime()) / DAY_MS);
  return entry.confidence * Math.pow(0.5, ageDays / DECAY_HALFLIFE_DAYS);
}

/**
 * Add or reinforce a lesson within an already-scoped, same-namespace set.
 * Evidence-gated. `now`/`id` are injected so the core stays pure/deterministic.
 */
export function upsertEntry(
  entries: MemoryEntry[],
  candidate: {
    namespace: MemoryNamespace;
    text: string;
    evidence: string;
    confidence?: number;
    status?: MemoryStatus;
  },
  now: string,
  id: string,
): MemoryEntry[] {
  const text = candidate.text.trim();
  const evidence = candidate.evidence.trim();
  if (!text || !evidence) return entries; // evidence-gated: no evidence, no write

  const out = entries.map((e) => ({ ...e }));
  const match = out.find((e) => e.namespace === candidate.namespace && isSameLesson(e.text, text));
  if (match) {
    match.evidenceCount += 1;
    // Dampened reinforcement toward 1 (never certain).
    match.confidence = Math.min(1, match.confidence + (1 - match.confidence) * 0.34);
    match.evidence = evidence;
    match.lastConfirmedAt = now; // reconfirmation revives it against decay
    if (match.status === "retired") match.status = "active";
    return out;
  }
  out.push({
    id,
    namespace: candidate.namespace,
    text,
    confidence: candidate.confidence ?? 0.34,
    evidence,
    evidenceCount: 1,
    pinned: false,
    status: candidate.status ?? "active",
    createdAt: now,
    lastConfirmedAt: now,
  });
  return out;
}

/** Retire (drop) unpinned entries whose decayed confidence fell below the floor. */
export function retireStale(entries: MemoryEntry[], now: string, floor = RETIRE_FLOOR): MemoryEntry[] {
  return entries.filter((e) => e.pinned || decayedConfidence(e, now) >= floor);
}

/** Backstop only: keep the strongest N per set (pinned always kept). */
export function enforceSafetyCap(entries: MemoryEntry[], now: string, cap = SAFETY_CAP): MemoryEntry[] {
  if (entries.length <= cap) return entries;
  const pinned = entries.filter((e) => e.pinned);
  const rest = entries
    .filter((e) => !e.pinned)
    .sort(
      (a, b) => decayedConfidence(b, now) - decayedConfidence(a, now) || b.evidenceCount - a.evidenceCount,
    );
  return [...pinned, ...rest].slice(0, Math.max(cap, pinned.length));
}

/**
 * Read side: the top-k lessons for a namespace, ranked by decayed confidence
 * (pinned first). This is the "uncapped storage, top-k retrieval" model — the
 * store can hold thousands; only k are surfaced per call.
 */
export function topByConfidence(
  entries: MemoryEntry[],
  namespace: MemoryNamespace,
  now: string,
  k = DEFAULT_TOPK,
  includeShadow = false,
): MemoryEntry[] {
  return entries
    .filter((e) => e.namespace === namespace && (e.status === "active" || (includeShadow && e.status === "shadow")))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return decayedConfidence(b, now) - decayedConfidence(a, now) || b.evidenceCount - a.evidenceCount;
    })
    .slice(0, k);
}

/**
 * Shadow→graduate lifecycle (C8): decide which shadow lessons become gating
 * ("active") and which fade out ("retire"). A shadow lesson graduates once it
 * has recurred enough (`shadowMinEvidence`) AND built enough confidence
 * (`autoGraduateConfidence`) — a criterion the render keeps tripping, not a
 * one-off. One that never recurs decays and retires. Pinned lessons are exempt.
 * Pure; the caller applies the status changes.
 */
export function planGraduation(
  entries: MemoryEntry[],
  cfg: { shadowMinEvidence: number; autoGraduateConfidence: number },
  now: string,
): { promote: string[]; retire: string[] } {
  const promote: string[] = [];
  const retire: string[] = [];
  for (const e of entries) {
    if (e.status !== "shadow" || e.pinned) continue;
    if (e.evidenceCount >= cfg.shadowMinEvidence && e.confidence >= cfg.autoGraduateConfidence) {
      promote.push(e.id);
    } else if (decayedConfidence(e, now) < RETIRE_FLOOR) {
      retire.push(e.id);
    }
  }
  return { promote, retire };
}

/**
 * Namespaces whose lessons are generalizable *technique* and therefore eligible
 * for the global-craft tier. The channel-specific ones (ideas, competitor intel,
 * niche what-works, metric winners) are hard-fenced to their channel and never
 * promote — the two-tier separation rule (C8 §two-tier scope).
 */
export const TECHNIQUE_NAMESPACES: MemoryNamespace[] = ["quality", "visual", "editing", "audio", "packaging", "script"];

export type ChannelLesson = { namespace: MemoryNamespace; text: string; projectId: string };

/**
 * The librarian's global-craft promotion (C8): a technique lesson independently
 * confirmed on ≥ `minChannels` distinct channels graduates to `global:craft`, so
 * every channel benefits — while one channel's fluke never becomes studio dogma.
 * Pure; the caller inserts the returned global entries.
 */
export function planGlobalPromotion(
  lessons: ChannelLesson[],
  existingGlobal: { namespace: MemoryNamespace; text: string }[],
  minChannels: number,
): { namespace: MemoryNamespace; text: string; evidence: string; channels: number }[] {
  const clusters: { namespace: MemoryNamespace; text: string; projects: Set<string> }[] = [];
  for (const l of lessons) {
    if (!TECHNIQUE_NAMESPACES.includes(l.namespace)) continue; // channel-only namespaces never promote
    let c = clusters.find((x) => x.namespace === l.namespace && isSameLesson(x.text, l.text));
    if (!c) {
      c = { namespace: l.namespace, text: l.text, projects: new Set() };
      clusters.push(c);
    }
    c.projects.add(l.projectId);
  }
  const out: { namespace: MemoryNamespace; text: string; evidence: string; channels: number }[] = [];
  for (const c of clusters) {
    if (c.projects.size < minChannels) continue;
    if (existingGlobal.some((g) => g.namespace === c.namespace && isSameLesson(g.text, c.text))) continue; // already global
    out.push({ namespace: c.namespace, text: c.text, evidence: `confirmed on ${c.projects.size} channels`, channels: c.projects.size });
  }
  return out;
}

/** Group issues into recurring buckets by their leading text (loose key). */
export function recurringIssues(issues: string[], minCount = 2): { text: string; count: number }[] {
  const buckets = new Map<string, { text: string; count: number }>();
  for (const raw of issues) {
    const text = (raw ?? "").trim();
    if (!text) continue;
    // Key on the criterion label prefix ("Hook: ...") or the first words.
    const key = (text.split(":")[0] || text).toLowerCase().slice(0, 40);
    const b = buckets.get(key);
    if (b) b.count += 1;
    else buckets.set(key, { text, count: 1 });
  }
  return [...buckets.values()].filter((b) => b.count >= minCount).sort((a, b) => b.count - a.count);
}
