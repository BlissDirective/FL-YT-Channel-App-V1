/**
 * Kinetic-highlight timing resolution — moved verbatim from the render farm
 * (render-queue.ts) so the EDD compiler wrapper resolves curated highlights
 * to the SAME timings the legacy render uses (audit A7). Pure; generic over
 * the curated shape so the app and render packages keep their own types.
 */

export type TimedWord = { w: string; start: number; end: number };

const HL_GAP_MS = 200;

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}$%.]/gu, "");

/**
 * Resolve curated highlights to beat-local timing using the beat's word
 * timestamps: a highlight appears when its emphasis word is spoken and holds
 * long enough to read. Falls back to ~20% into the beat when the word can't
 * be located (e.g. a rewritten phrase with no shared token). Multiple
 * highlights on one beat (the hook always has ≥2 for the Short) are then
 * de-overlapped so they play in sequence rather than stacking on screen.
 */
export function resolveHighlightTiming<T extends { text: string; emphasisWord?: string }>(
  curated: T[],
  words: TimedWord[],
  durationSec: number,
): (T & { startMs: number; endMs: number })[] {
  const beatMs = Math.max(0, durationSec * 1000);
  const resolved = curated.map((h) => {
    const wordCount = h.text.trim().split(/\s+/).filter(Boolean).length;
    const readMs = Math.max(1600, wordCount * 340);

    let startMs = Math.round(beatMs * 0.2);
    const emph = h.emphasisWord ? normWord(h.emphasisWord.split(/\s+/)[0] ?? "") : "";
    if (emph && words.length) {
      const hit =
        words.find((w) => normWord(w.w) === emph) ??
        words.find((w) => normWord(w.w).includes(emph) && emph.length >= 3);
      if (hit) startMs = Math.round(hit.start * 1000);
    }

    let endMs = startMs + readMs;
    if (beatMs > 0) {
      endMs = Math.min(endMs, beatMs - 50);
      if (endMs - startMs < 800) startMs = Math.max(0, endMs - readMs);
    }
    return { ...h, startMs, endMs };
  });

  // De-overlap within the beat: keep highlights sequential with a small gap so
  // two never share the screen. Push later ones back; clamp to the beat.
  resolved.sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < resolved.length; i++) {
    const prev = resolved[i - 1];
    const cur = resolved[i];
    if (cur.startMs < prev.endMs + HL_GAP_MS) {
      const readMs = Math.max(1600, cur.text.trim().split(/\s+/).filter(Boolean).length * 340);
      cur.startMs = prev.endMs + HL_GAP_MS;
      cur.endMs = cur.startMs + readMs;
    }
    if (beatMs > 0 && cur.endMs > beatMs - 50) {
      cur.endMs = beatMs - 50;
      if (cur.startMs > cur.endMs - 600) cur.startMs = Math.max(0, cur.endMs - 600);
    }
  }
  return resolved;
}
