import "server-only";

/**
 * Exemplar library (agent-training build, Steps 2 + 4).
 *
 * "Training" the agents here means exemplar-conditioned generation: the
 * script writer sees a handful of PROVEN winners — mined from the niche via
 * the existing YouTube research + Gemini perception adapters, plus this
 * channel's own top performers promoted by the outcome loop — as few-shot
 * references in its prompt. Judges then rank; they don't gate.
 *
 * Everything degrades gracefully: no YouTube key → deterministic mock niche
 * results; no Gemini key → mock perception; a missing exemplars table never
 * blocks generation (the prompt simply carries no exemplar block).
 */
import { searchNiche, type NicheVideo } from "@/lib/adapters/youtube";
import { analyzeYoutubeVideo } from "@/lib/adapters/gemini-video";
import type { Db } from "@/lib/pipeline/engine";
import type { Project, ScriptBeat } from "@/lib/db/types";

export type ExemplarRow = {
  id?: string;
  project_id: string;
  origin: "mined" | "own";
  source: { videoId: string; title: string; channel?: string; views?: number; url?: string };
  hook: string | null;
  structure: {
    beats?: { label: string; atSec?: number }[];
    pacing?: string;
    visualStyle?: string;
  };
  title_pattern: string | null;
  notes: string | null;
  score: number | null;
};

/** Exemplar shape the script prompt consumes (adapter-side type mirror). */
export type ScriptExemplar = {
  title: string;
  hook: string | null;
  structureSummary: string | null;
  notes: string | null;
  origin: "mined" | "own";
};

/* ------------------------------------------------------------------ */
/* Step 2 — mining                                                     */
/* ------------------------------------------------------------------ */

export type MineResult = {
  ok: boolean;
  error?: string;
  mined: number;
  skipped: number;
  costUsd: number;
};

/**
 * Mine winner exemplars for a project's niche: search YouTube for the
 * strongest videos on the niche+angle, run video perception on the top hits,
 * and distill each into hook + beat structure + pacing. Idempotent per
 * source video (re-mining refreshes stats/score).
 */
export async function mineExemplars(
  db: Db,
  project: Pick<Project, "id" | "niche" | "angle" | "audience">,
  opts: { max?: number } = {},
): Promise<MineResult> {
  const max = Math.min(Math.max(opts.max ?? 6, 1), 12);
  let candidates: NicheVideo[];
  try {
    candidates = await searchNiche(`${project.niche} ${project.angle}`.trim(), max * 2);
  } catch (err) {
    return { ok: false, error: `Niche search failed: ${msg(err)}`, mined: 0, skipped: 0, costUsd: 0 };
  }
  const top = candidates.filter((c) => c.videoId).slice(0, max);
  if (top.length === 0) {
    return { ok: false, error: "No niche videos found to mine.", mined: 0, skipped: 0, costUsd: 0 };
  }

  let mined = 0;
  let skipped = 0;
  let costUsd = 0;
  for (const v of top) {
    try {
      const { perception, costUsd: c } = await analyzeYoutubeVideo({
        url: v.url || `https://youtu.be/${v.videoId}`,
      });
      costUsd += c;
      const notes = perception.notes ?? [];
      const hook =
        perception.transcript && perception.transcript.length > 10
          ? firstSentences(perception.transcript, 220)
          : (notes[0]?.sceneDesc ?? null);
      const row: ExemplarRow = {
        project_id: project.id,
        origin: "mined",
        source: { videoId: v.videoId, title: v.title, channel: v.channelTitle, views: v.views, url: v.url },
        hook,
        structure: {
          beats: notes.slice(0, 12).map((n) => ({ label: n.sceneDesc, atSec: n.t })),
          pacing: summarizePacing(notes.map((n) => n.pacingNote).filter(Boolean) as string[]),
          visualStyle: summarizeShots(notes.map((n) => n.shotType).filter(Boolean) as string[]),
        },
        title_pattern: v.title,
        notes: null,
        score: Math.log10(Math.max(v.views, 1)),
      };
      await upsertExemplar(db, row);
      mined++;
    } catch (err) {
      console.error(`exemplar mining skipped ${v.videoId}:`, err);
      skipped++;
    }
  }
  return { ok: mined > 0, error: mined > 0 ? undefined : "Every candidate failed to mine.", mined, skipped, costUsd };
}

/* ------------------------------------------------------------------ */
/* Step 4 — outcome loop                                               */
/* ------------------------------------------------------------------ */

export type OutcomeSummary = {
  tracked: number;
  /** Pearson correlation between final QC score and log-views (null < 3 pairs). */
  qcViewsCorrelation: number | null;
  avgQcTopHalf: number | null;
  avgQcBottomHalf: number | null;
  promotedOwnWinners: number;
};

/**
 * The outcome loop: join each published video's FINAL-gate QC score to its
 * real performance (latest views snapshot), report whether QC is actually
 * predictive on this channel, and auto-promote the channel's own top
 * performers into the exemplar library as first-party training data.
 */
export async function runOutcomeLoop(db: Db, projectId: string): Promise<OutcomeSummary> {
  const { data: vids } = await db
    .from("videos")
    .select("id, title, status, youtube_video_id")
    .eq("project_id", projectId)
    .eq("status", "TRACKING");
  const tracking = (vids ?? []) as { id: string; title: string; youtube_video_id: string | null }[];
  const summary: OutcomeSummary = {
    tracked: tracking.length,
    qcViewsCorrelation: null,
    avgQcTopHalf: null,
    avgQcBottomHalf: null,
    promotedOwnWinners: 0,
  };
  if (tracking.length === 0) return summary;

  const pairs: { videoId: string; title: string; qc: number | null; views: number }[] = [];
  for (const v of tracking) {
    const [{ data: snap }, { data: qc }] = await Promise.all([
      db
        .from("analytics_snapshots")
        .select("views")
        .eq("video_id", v.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("qc_reviews")
        .select("score")
        .eq("video_id", v.id)
        .eq("gate", "FINAL")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    pairs.push({
      videoId: v.id,
      title: v.title,
      qc: qc?.score != null ? Number(qc.score) : null,
      views: Number(snap?.views ?? 0),
    });
  }

  const scored = pairs.filter((p) => p.qc != null);
  if (scored.length >= 3) {
    const xs = scored.map((p) => p.qc as number);
    const ys = scored.map((p) => Math.log10(Math.max(p.views, 1)));
    summary.qcViewsCorrelation = pearson(xs, ys);
    const byViews = [...scored].sort((a, b) => b.views - a.views);
    const half = Math.floor(byViews.length / 2);
    summary.avgQcTopHalf = avg(byViews.slice(0, half).map((p) => p.qc as number));
    summary.avgQcBottomHalf = avg(byViews.slice(byViews.length - half).map((p) => p.qc as number));
  }

  // Own-winner promotion: videos beating 1.5× the channel median become
  // first-party exemplars (their real hook + beat structure from the script).
  const withViews = pairs.filter((p) => p.views > 0).sort((a, b) => a.views - b.views);
  if (withViews.length >= 2) {
    const median = withViews[Math.floor(withViews.length / 2)].views;
    const winners = pairs.filter((p) => p.views >= Math.max(median * 1.5, 1));
    for (const w of winners) {
      const { data: script } = await db
        .from("scripts")
        .select("beats")
        .eq("video_id", w.videoId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const beats = ((script?.beats ?? []) as ScriptBeat[]).filter((b) => b.text?.trim());
      if (beats.length === 0) continue;
      await upsertExemplar(db, {
        project_id: projectId,
        origin: "own",
        source: { videoId: w.videoId, title: w.title, views: w.views },
        hook: firstSentences(beats[0].text, 220),
        structure: { beats: beats.slice(0, 12).map((b) => ({ label: shorten(b.text, 70) })) },
        title_pattern: w.title,
        notes: `This channel's own winner — ${w.views.toLocaleString()} views (median ${median.toLocaleString()}).`,
        score: 2 + Math.log10(Math.max(w.views, 1)), // own winners outrank mined ones
      });
      summary.promotedOwnWinners++;
    }
  }
  return summary;
}

/* ------------------------------------------------------------------ */
/* Retrieval — the prompt side                                          */
/* ------------------------------------------------------------------ */

/** Top exemplars for prompt injection; best-effort (missing table → []). */
export async function getScriptExemplars(
  db: Db,
  projectId: string,
  max = 3,
): Promise<ScriptExemplar[]> {
  try {
    const { data } = await db
      .from("exemplars")
      .select("origin, source, hook, structure, title_pattern, notes, score")
      .eq("project_id", projectId)
      .limit(48);
    // Rank in JS (portable across PostgREST and the fake harness, whose
    // order() is a no-op). Own winners lead structurally — they're first-party
    // ground truth for THIS channel's audience, however big the mined
    // outsiders' view counts are — then score desc within each origin.
    const ranked = ((data ?? []) as ExemplarRow[])
      .sort(
        (a, b) =>
          (a.origin === "own" ? 0 : 1) - (b.origin === "own" ? 0 : 1) ||
          Number(b.score ?? 0) - Number(a.score ?? 0),
      )
      .slice(0, max);
    return ranked.map((e) => ({
      title: e.source?.title ?? e.title_pattern ?? "Untitled",
      hook: e.hook,
      structureSummary: summarizeStructure(e.structure),
      notes: e.notes,
      origin: e.origin,
    }));
  } catch (err) {
    console.error("exemplar retrieval failed (non-blocking):", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

async function upsertExemplar(db: Db, row: ExemplarRow): Promise<void> {
  // Converge manually on (project, origin, source.videoId): select-filter-
  // delete-insert works identically on PostgREST and the fake-db harness
  // (which has no jsonb-path filters or expression-index upserts).
  const { data } = await db
    .from("exemplars")
    .select("id, source")
    .eq("project_id", row.project_id)
    .eq("origin", row.origin);
  const existing = ((data ?? []) as { id: string; source?: { videoId?: string } }[]).find(
    (r) => r.source?.videoId === row.source.videoId,
  );
  if (existing?.id) {
    await db.from("exemplars").delete().eq("id", existing.id);
  }
  // Explicit id: Postgres would default one, but the fake-db harness doesn't —
  // and the id is what makes the next upsert's delete find this row.
  await db.from("exemplars").insert({ id: crypto.randomUUID(), ...row } as never);
}

function summarizeStructure(s: ExemplarRow["structure"]): string | null {
  const beats = s?.beats ?? [];
  if (beats.length === 0) return null;
  const parts = beats.slice(0, 6).map((b, i) => `${i + 1}. ${shorten(b.label, 60)}`);
  const extras = [s.pacing && `pacing: ${s.pacing}`, s.visualStyle && `visuals: ${s.visualStyle}`]
    .filter(Boolean)
    .join("; ");
  return `${parts.join(" → ")}${extras ? ` (${extras})` : ""}`;
}

function summarizePacing(notes: string[]): string | undefined {
  if (notes.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const n of notes) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function summarizeShots(shots: string[]): string | undefined {
  if (shots.length === 0) return undefined;
  return [...new Set(shots)].slice(0, 4).join(", ");
}

function firstSentences(text: string, maxChars: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length <= maxChars ? t : `${t.slice(0, maxChars).replace(/\s\S*$/, "")}…`;
}

function shorten(text: string, maxChars: number): string {
  return firstSentences(text, maxChars);
}

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = avg(xs)!;
  const my = avg(ys)!;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return Math.round((num / Math.sqrt(dx * dy)) * 100) / 100;
}

function avg(ns: number[]): number | null {
  return ns.length === 0 ? null : Math.round((ns.reduce((s, n) => s + n, 0) / ns.length) * 100) / 100;
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
