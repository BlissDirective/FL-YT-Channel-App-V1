import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Evidence-gated playbook (Harness C4, Fable5-Agentic-Harness-Plan.md).
 *
 * The prior memory was flat string arrays with no evidence, confidence, or
 * expiry — the documented memory-degradation failure mode (stale lessons,
 * confabulated causes, unbounded growth). This governs it as ACE-style
 * tagged bullets:
 *  - WRITE only with quantitative evidence (a QC/retention delta), never the
 *    model's guess about why something flopped.
 *  - REINFORCE a matching lesson (bump confidence + refresh timestamp)
 *    instead of duplicating.
 *  - HYGIENE: cap per project, expire bullets unconfirmed for 90 days.
 *  - READ only stage-relevant bullets into prompts.
 * Raw outcomes stay immutable in qc_reviews / autofix_runs / analytics.
 *
 * The governance functions are pure (unit-tested); the DB read/write are thin.
 */

type Db = ReturnType<typeof createAdminClient>;

export type PlaybookStage = "idea" | "script" | "visual" | "packaging";

export type PlaybookEntry = {
  id: string;
  stage: PlaybookStage;
  /** The lesson, phrased as guidance for the next generation. */
  text: string;
  /** Rises each time fresh evidence confirms it (dampened, capped at 1). */
  confidence: number;
  /** How the lesson was earned (e.g. "autofix +1.8 QC", "retention +6%"). */
  evidence: string;
  /** How many independent evidence events back it. */
  evidenceCount: number;
  createdAt: string;
  lastConfirmedAt: string;
};

export const PLAYBOOK_CAP = 40;
export const STALE_DAYS = 90;

/** Loose match: same stage and strong text overlap → the same lesson. */
function isSameLesson(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 3);
  const wa = new Set(norm(a));
  const wb = new Set(norm(b));
  if (wa.size === 0 || wb.size === 0) return false;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size) >= 0.6;
}

/**
 * Add or reinforce a lesson. Requires non-empty evidence (the write policy).
 * `now`/`id` are injected so the core stays pure and deterministic in tests.
 */
export function upsertLesson(
  entries: PlaybookEntry[],
  candidate: { stage: PlaybookStage; text: string; evidence: string; confidence?: number },
  now: string,
  id: string,
): PlaybookEntry[] {
  const text = candidate.text.trim();
  const evidence = candidate.evidence.trim();
  if (!text || !evidence) return entries; // evidence-gated: no evidence, no write

  const out = entries.map((e) => ({ ...e }));
  const match = out.find((e) => e.stage === candidate.stage && isSameLesson(e.text, text));
  if (match) {
    match.evidenceCount += 1;
    // Dampened reinforcement toward 1 (never certain).
    match.confidence = Math.min(1, match.confidence + (1 - match.confidence) * 0.34);
    match.evidence = evidence;
    match.lastConfirmedAt = now;
    return out;
  }
  out.push({
    id,
    stage: candidate.stage,
    text,
    confidence: candidate.confidence ?? 0.34,
    evidence,
    evidenceCount: 1,
    createdAt: now,
    lastConfirmedAt: now,
  });
  return out;
}

/** Drop bullets not confirmed within STALE_DAYS. */
export function expireStale(entries: PlaybookEntry[], now: string, maxAgeDays = STALE_DAYS): PlaybookEntry[] {
  const cutoff = new Date(now).getTime() - maxAgeDays * 86_400_000;
  return entries.filter((e) => new Date(e.lastConfirmedAt).getTime() >= cutoff);
}

/** Keep the strongest bullets (confidence, then evidence count, then recency). */
export function capEntries(entries: PlaybookEntry[], cap = PLAYBOOK_CAP): PlaybookEntry[] {
  return [...entries]
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        b.evidenceCount - a.evidenceCount ||
        new Date(b.lastConfirmedAt).getTime() - new Date(a.lastConfirmedAt).getTime(),
    )
    .slice(0, cap);
}

/** Full write-side hygiene pass: upsert → expire → cap. */
export function curate(
  entries: PlaybookEntry[],
  candidate: { stage: PlaybookStage; text: string; evidence: string; confidence?: number },
  now: string,
  id: string,
): PlaybookEntry[] {
  return capEntries(expireStale(upsertLesson(entries, candidate, now, id), now));
}

/** Read side: the top-k confident lessons for a stage, for prompt injection. */
export function retrieveForStage(entries: PlaybookEntry[], stage: PlaybookStage, k = 5): string[] {
  return entries
    .filter((e) => e.stage === stage)
    .sort((a, b) => b.confidence - a.confidence || b.evidenceCount - a.evidenceCount)
    .slice(0, k)
    .map((e) => e.text);
}

// ── DB helpers ────────────────────────────────────────────────────────

export async function loadPlaybook(db: Db, projectId: string): Promise<PlaybookEntry[]> {
  const { data } = await db.from("projects").select("playbook").eq("id", projectId).maybeSingle();
  const raw = (data?.playbook ?? []) as PlaybookEntry[];
  return Array.isArray(raw) ? raw : [];
}

/**
 * Record a lesson with evidence and persist the curated playbook. `id`/`now`
 * are generated here (crypto.randomUUID / new Date) — callers stay simple.
 */
export async function recordLesson(
  db: Db,
  projectId: string,
  candidate: { stage: PlaybookStage; text: string; evidence: string; confidence?: number },
): Promise<void> {
  try {
    const entries = await loadPlaybook(db, projectId);
    const next = curate(entries, candidate, new Date().toISOString(), crypto.randomUUID());
    await db.from("projects").update({ playbook: next }).eq("id", projectId);
  } catch (err) {
    console.error("playbook write failed (non-fatal):", err);
  }
}

export async function playbookForStage(db: Db, projectId: string, stage: PlaybookStage, k = 5): Promise<string[]> {
  try {
    return retrieveForStage(await loadPlaybook(db, projectId), stage, k);
  } catch {
    return [];
  }
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

/**
 * Reflector/Curator for the script stage (Harness C4): a QC issue that recurs
 * across multiple scripts is a real, evidence-backed pattern — promote it to a
 * governed lesson. Evidence = the recurrence count; confidence scales with it.
 */
export async function curateScriptLessons(db: Db, projectId: string): Promise<{ promoted: number }> {
  const { data: vids } = await db.from("videos").select("id").eq("project_id", projectId);
  const ids = ((vids ?? []) as { id: string }[]).map((v) => v.id);
  if (ids.length < 3) return { promoted: 0 };
  const { data: revs } = await db
    .from("qc_reviews")
    .select("issues, score")
    .in("video_id", ids)
    .eq("gate", "SCRIPT")
    .order("created_at", { ascending: false })
    .limit(40);
  const allIssues = ((revs ?? []) as { issues: string[] }[]).flatMap((r) => r.issues ?? []);
  const recurring = recurringIssues(allIssues, 3).slice(0, 5);
  let promoted = 0;
  for (const r of recurring) {
    await recordLesson(db, projectId, {
      stage: "script",
      text: `Recurring script issue — pre-empt it: ${r.text}`,
      evidence: `flagged on ${r.count} scripts`,
      confidence: Math.min(0.6, 0.3 + r.count * 0.05),
    });
    promoted += 1;
  }
  return { promoted };
}
