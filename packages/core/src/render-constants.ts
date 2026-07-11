/**
 * Render timing constants + legacy copy, hoisted from the render package so
 * the app (EDD compiler wrapper, /edit UI) and the render farm share one
 * source. packages/render/src/types.ts re-exports these — render code keeps
 * importing from "./types" unchanged.
 */

export const RENDER_FPS = 30;

/** Intro title card. ~3s — long enough for a short narrated hook line. */
export const INTRO_SEC = 3;
export const OUTRO_SEC = 4;

/** CTA tail appended after the last beat of a full vertical short. */
export const SHORT_TAIL_SEC = 1.5;

/** The legacy LongForm CTA lower-third copy (audit A5 — compiled EDDs carry
    it as a lowerThird overlay so the document owns the cue). */
export const CTA_TEXT = "Enjoying this? Subscribe — it's free";
