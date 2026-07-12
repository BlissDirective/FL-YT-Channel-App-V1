import type { EditDocument } from "./edd";
import { introOutroRuntime } from "./edd";

/**
 * Retention → EDD attribution (MVDA Phase E, plan §3: "retention attribution
 * gets strictly better" — dips map to explicit clips/transitions/caption
 * styles, not just beats). Pure over the document + the YouTube Analytics
 * audience-retention curve; the outcome-audit pass turns the worst dips into
 * editing-namespace shadow lessons (Tier A evidence, §11.2).
 */

export type RetentionPoint = {
  /** Position in the video, 0..1 (elapsedVideoTimeRatio). */
  ratio: number;
  /** Share of starting viewers still watching (audienceWatchRatio). */
  watchRatio: number;
};

export type EddDip = {
  /** Seconds into the video where the drop lands. */
  atSec: number;
  /** Percentage-point drop in watch ratio across the sample window. */
  dropPts: number;
  clipId: string | null;
  beatIdx: number | null;
  source: string | null;
  motionKind: string | null;
  /** The transition INTO the clip when the dip lands near its head — the
      boundary is then the prime suspect, not the clip body. */
  transitionInto: string | null;
  captionStyle: string | null;
  emphasisCount: number;
};

/** Ignore the universal intro cliff — every video sheds viewers in the first
    few percent; that is packaging/hook territory, not the cut's. */
const SKIP_HEAD_RATIO = 0.06;
/** A dip is "at the boundary" when it lands this close to the clip's head. */
const BOUNDARY_SEC = 1.0;

export function attributeRetentionToEdd(
  doc: EditDocument,
  curve: RetentionPoint[],
  opts: { minDropPts?: number; maxDips?: number } = {},
): EddDip[] {
  const minDrop = opts.minDropPts ?? 3; // percentage points between samples
  const maxDips = opts.maxDips ?? 3;
  if (curve.length < 3) return [];
  const runtime = introOutroRuntime(doc);
  if (runtime <= 0) return [];

  const samples = [...curve].sort((a, b) => a.ratio - b.ratio);
  const dips: EddDip[] = [];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (cur.ratio < SKIP_HEAD_RATIO) continue;
    const dropPts = Math.round((prev.watchRatio - cur.watchRatio) * 1000) / 10;
    if (dropPts < minDrop) continue;

    const atSec = Math.round(cur.ratio * runtime * 10) / 10;
    const clips = doc.tracks.video;
    const ci = clips.findIndex((c) => atSec >= c.start && atSec < c.start + c.duration);
    const clip = ci >= 0 ? clips[ci] : null;
    const nearHead = clip != null && atSec - clip.start <= BOUNDARY_SEC;
    const prevClip = ci > 0 ? clips[ci - 1] : null;

    const ms = atSec * 1000;
    const page = doc.tracks.captions.find((p) => ms >= p.startMs && ms < p.endMs) ?? null;

    dips.push({
      atSec,
      dropPts,
      clipId: clip?.id ?? null,
      beatIdx: clip?.beatIdx ?? null,
      source: clip?.source ?? null,
      motionKind: clip?.motion.kind ?? null,
      transitionInto: nearHead && prevClip ? prevClip.transitionOut.kind : null,
      captionStyle: page?.style ?? null,
      emphasisCount: page ? page.tokens.filter((t) => t.emphasis !== "none").length : 0,
    });
  }

  // Worst first; one dip per clip (keep the deepest) so a single bad clip
  // doesn't consume the whole report.
  dips.sort((a, b) => b.dropPts - a.dropPts);
  const seen = new Set<string>();
  const out: EddDip[] = [];
  for (const d of dips) {
    const key = d.clipId ?? `t${d.atSec}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
    if (out.length >= maxDips) break;
  }
  return out;
}

/** Human/lesson phrasing for one dip — shared by outcome-audit and any UI. */
export function describeDip(d: EddDip): string {
  const where = d.beatIdx != null ? `beat ${d.beatIdx}` : `${d.atSec}s`;
  const parts: string[] = [];
  if (d.transitionInto) parts.push(`right after a ${d.transitionInto} transition`);
  if (d.source) parts.push(d.motionKind === "none" ? `static ${d.source}` : `${d.source} + ${d.motionKind}`);
  if (d.captionStyle) parts.push(`captions ${d.captionStyle}${d.emphasisCount ? ` (${d.emphasisCount} emphasized)` : ""}`);
  return `Retention dropped ${d.dropPts.toFixed(1)}pts at ${where} (${d.atSec}s)${parts.length ? ` — ${parts.join(", ")}` : ""}`;
}
