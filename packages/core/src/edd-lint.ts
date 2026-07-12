import type { EditDocument } from "./edd";
import { introOutroRuntime } from "./edd";

/**
 * EDD taste lint (MVDA Phase D, plan §8 "loudness/QC lint"). Advisory
 * WARNINGS — never blockers: validateEdd owns correctness (gapless, refs,
 * fits); lintEdd owns craft (readability, loudness sanity, pacing habits).
 * Consumed by the agent (judge context + get_context) and surfaceable in
 * /edit; a warned document still saves, renders, and ships.
 */

export type LintWarning = { rule: string; where: string; msg: string };

/** Mobile-readability bound: a caption page longer than this reads as a wall
    of text at TikTok sizes (~2 lines at the clean style's scale). */
const PAGE_CHAR_LIMIT = 42;
/** Loudness sanity band for cue gain. -60 is the reserved intentional-mute
    value (setClipSilent); anything else below -24 is inaudible-by-accident,
    above +6 clips. */
const GAIN_MIN_DB = -24;
const GAIN_MAX_DB = 6;
const MUTE_DB = -60;
/** More than this many consecutive non-cut transitions reads as a slideshow. */
const MAX_TRANSITION_RUN = 3;
/** A motionless still held longer than this goes visually dead. */
const MAX_STATIC_STILL_SEC = 8;

export function lintEdd(doc: EditDocument): LintWarning[] {
  const warnings: LintWarning[] = [];
  const add = (rule: string, where: string, msg: string) => warnings.push({ rule, where, msg });
  const runtime = introOutroRuntime(doc);

  // ── Captions: page length + emphasis density ──
  let emphasized = 0;
  let tokens = 0;
  doc.tracks.captions.forEach((page, p) => {
    const text = page.tokens.map((t) => t.text).join(" ");
    if (text.length > PAGE_CHAR_LIMIT) {
      add("caption.pageLength", `captions[${p}]`, `page is ${text.length} chars (> ${PAGE_CHAR_LIMIT}) — split for mobile readability`);
    }
    const pageEmphasized = page.tokens.filter((t) => t.emphasis !== "none").length;
    if (pageEmphasized > 1) {
      add("caption.emphasisDensity", `captions[${p}]`, `${pageEmphasized} emphasized tokens on one page — one strong word beats ${pageEmphasized} weak ones`);
    }
    emphasized += pageEmphasized;
    tokens += page.tokens.length;
  });
  if (tokens > 0 && emphasized / tokens > 0.2) {
    add("caption.emphasisDensity", "captions", `${Math.round((emphasized / tokens) * 100)}% of tokens emphasized (> 20%) — emphasis only works when it is rare`);
  }

  // ── Audio: gain sanity + SFX density ──
  let sfxCount = 0;
  doc.tracks.audio.forEach((cue, i) => {
    const where = `audio[${i}]`;
    if (cue.kind === "sfx") sfxCount++;
    const isIntentionalMute = cue.kind === "vo" && cue.gainDb === MUTE_DB;
    if (!isIntentionalMute && (cue.gainDb < GAIN_MIN_DB || cue.gainDb > GAIN_MAX_DB)) {
      add("audio.gain", where, `${cue.kind} gain ${cue.gainDb}dB outside [${GAIN_MIN_DB}, ${GAIN_MAX_DB}] — inaudible or clipping`);
    }
  });
  const sfxBudget = Math.max(2, Math.ceil(runtime / 20));
  if (sfxCount > sfxBudget) {
    add("audio.sfxDensity", "audio", `${sfxCount} SFX cues in ${Math.round(runtime)}s (budget ~${sfxBudget}) — sound design, not a soundboard`);
  }

  // ── Pacing: transition runs + dead stills ──
  let run = 0;
  doc.tracks.video.forEach((clip, i) => {
    if (clip.transitionOut.kind !== "cut") {
      run++;
      if (run === MAX_TRANSITION_RUN + 1) {
        add("pacing.transitionRun", `video[${i}]`, `more than ${MAX_TRANSITION_RUN} consecutive non-cut transitions — cuts are the default, transitions are punctuation`);
      }
    } else {
      run = 0;
    }
    if (clip.source === "still" && clip.motion.kind === "none" && clip.duration > MAX_STATIC_STILL_SEC && !clip.silent) {
      add("pacing.staticStill", `video[${i}]`, `motionless still held ${clip.duration.toFixed(1)}s (> ${MAX_STATIC_STILL_SEC}s) — add motion or split the beat`);
    }
  });

  return warnings;
}

/** One-line lint summary for agent tool output / UI chips. */
export function lintSummary(warnings: LintWarning[]): string {
  if (warnings.length === 0) return "lint: clean";
  const byRule = new Map<string, number>();
  for (const w of warnings) byRule.set(w.rule, (byRule.get(w.rule) ?? 0) + 1);
  return `lint: ${warnings.length} warning${warnings.length === 1 ? "" : "s"} (${[...byRule].map(([r, n]) => `${r}×${n}`).join(", ")})`;
}
