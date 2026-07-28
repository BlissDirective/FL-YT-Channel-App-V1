import "server-only";

/**
 * Forced-alignment for sing-along captions.
 *
 * The song providers we use (MiniMax Music, ElevenLabs Music) sing our lyrics
 * but return NO word timings, so captions defaulted to an even split across
 * each scene — close, but never frame-accurate to the vocal. This module aligns
 * the KNOWN lyrics to the ACTUAL sung audio:
 *
 *   1. Transcribe the audio with word-level timestamps (fal Whisper). The ASR
 *      mishears some sung words, but the onset TIMES it reports are real.
 *   2. Align the known lyric tokens to the ASR tokens (longest-common
 *      subsequence on normalised text). Matched lyric words inherit the ASR
 *      word's start/end; unmatched runs are linearly interpolated between their
 *      surrounding anchors.
 *
 * The result is one absolute-time word list for the whole song. The render
 * worker slices it per scene by time, so the karaoke highlight follows the
 * singer regardless of which illustration is on screen.
 *
 * Best-effort by construction: any failure (no key, ASR error, zero matches)
 * returns null and the caller keeps the even-split behaviour.
 */
import { falTranscribeWords, isFalLive } from "./fal";

export type AlignedWord = { w: string; start: number; end: number };

/** Lower-case, strip everything but a–z0–9 — the comparison key for matching a
    lyric token to an ASR token ("Claude." ↔ "claude"). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Flatten sung lyrics to an ordered token list, preserving the display form.
    Section tags ([Verse]/[Chorus]) are dropped; parenthetical stage directions
    are dropped (they are printed cues like "(clap, clap!)", rarely sung and
    would only add noise to the alignment). Everything else becomes one token
    per whitespace-separated word. */
export function lyricTokens(lyrics: string): string[] {
  const tokens: string[] = [];
  for (const raw of lyrics.split("\n")) {
    let line = raw.trim();
    if (!line || /^\[.*\]$/.test(line)) continue;
    line = line.replace(/\([^)]*\)/g, " "); // drop (stage directions)
    for (const w of line.split(/\s+/)) {
      const cleaned = w.trim();
      if (cleaned && norm(cleaned)) tokens.push(cleaned);
    }
  }
  return tokens;
}

/** LCS backtrace → matched (lyricIdx, asrIdx) anchor pairs, in order. */
function lcsAnchors(lyric: string[], asr: string[]): { li: number; ai: number }[] {
  const n = lyric.length;
  const m = asr.length;
  const L = lyric.map(norm);
  const A = asr.map(norm);
  // DP table (n+1)×(m+1). n,m are a couple hundred at most — trivially small.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = L[i] === A[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const anchors: { li: number; ai: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (L[i] === A[j]) {
      anchors.push({ li: i, ai: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return anchors;
}

/**
 * Align known lyrics to the sung audio. Returns absolute-time word timings for
 * every lyric token, or null if alignment isn't possible (no ASR, no matches).
 */
export async function alignLyricsToAudio(opts: {
  audioUrl: string;
  lyrics: string;
  /** Total song length; bounds the trailing interpolation. */
  durationSec?: number;
}): Promise<{ words: AlignedWord[]; costUsd: number } | null> {
  if (!isFalLive()) return null;
  const tokens = lyricTokens(opts.lyrics);
  if (tokens.length === 0) return null;

  let asr: { w: string; start: number; end: number }[];
  let costUsd = 0;
  try {
    const t = await falTranscribeWords({ audioUrl: opts.audioUrl });
    asr = t.words;
    costUsd = t.costUsd;
  } catch {
    return null;
  }
  if (asr.length === 0) return null;

  const anchors = lcsAnchors(tokens, asr.map((a) => a.w));
  // Need enough anchors to trust the alignment; below that, even-split is safer.
  if (anchors.length < Math.min(4, Math.ceil(tokens.length * 0.15))) return null;

  const words: AlignedWord[] = tokens.map((w) => ({ w, start: NaN, end: NaN }));
  // Pin matched tokens to their ASR times.
  for (const { li, ai } of anchors) {
    words[li].start = asr[ai].start;
    words[li].end = Math.max(asr[ai].end, asr[ai].start + 0.05);
  }

  const total =
    opts.durationSec && opts.durationSec > 0
      ? opts.durationSec
      : (words[anchors[anchors.length - 1].li].end ?? 0) + 1;

  // Fill unmatched runs by linear interpolation between the surrounding anchors
  // (and the 0 / song-end boundaries for the leading / trailing runs).
  let k = 0;
  while (k < words.length) {
    if (Number.isFinite(words[k].start)) {
      k++;
      continue;
    }
    let j = k;
    while (j < words.length && !Number.isFinite(words[j].start)) j++;
    const gapStart = k > 0 ? words[k - 1].end : 0;
    const gapEnd = j < words.length ? words[j].start : total;
    const count = j - k;
    const span = Math.max(0.001, gapEnd - gapStart);
    const per = span / (count + 1);
    for (let x = 0; x < count; x++) {
      const s = gapStart + per * (x + 1);
      words[k + x].start = s;
      words[k + x].end = s + per;
    }
    k = j;
  }

  // Enforce monotonic, sane bounds.
  let prev = 0;
  for (const wd of words) {
    if (!Number.isFinite(wd.start) || wd.start < prev) wd.start = prev;
    if (!Number.isFinite(wd.end) || wd.end <= wd.start) wd.end = wd.start + 0.1;
    prev = wd.start;
  }

  return { words, costUsd };
}
