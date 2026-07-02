// Stick Studio — Tier-1 vision critique. Claude looks at rendered keyframe
// stills of a stick video and scores them against an animation rubric (pose
// readability, composition/safe-area, caption legibility, character
// consistency), returning concrete, beat-anchored fixes. Runs in the render
// farm after a stick render; the result is stored on videos.vision_review.
//
// Thin config over the shared vision-critique core (Phase 7) — the fetch/
// parse/cost plumbing lives in ../vision-critique.ts.

import { critiqueFrames, visionCriticLive, type FrameCritique, type FrameIssue } from "../vision-critique";

export { visionCriticLive };
export type { FrameCritique, FrameIssue };

export type CritiqueFrame = {
  beatIdx: number;
  /** base64 JPEG (no data: prefix). */
  jpegBase64: string;
  action: string;
  setting: string;
  text: string;
};

export async function critiqueStickFrames(opts: {
  title: string;
  frames: CritiqueFrame[];
}): Promise<FrameCritique> {
  return critiqueFrames(
    opts.title,
    opts.frames.map((f) => ({
      beatIdx: f.beatIdx,
      jpegBase64: f.jpegBase64,
      label: `Beat ${f.beatIdx}: action="${f.action}", setting="${f.setting}" — "${f.text}"`,
    })),
    {
      intro: `You are a senior animation director reviewing keyframe stills from a stick-figure YouTube short titled "__TITLE__". Each image is one beat. The art is intentionally simple flat black stick figures — do NOT critique it for lacking detail; judge it as stick animation.

For each frame, assess:
- READABILITY: is the protagonist's action unmistakable from the pose alone?
- COMPOSITION / SAFE-AREA: is the figure well-framed (not cut off, not tiny, not crowding the caption), centred-ish for 9:16?
- CAPTIONS: is the on-screen caption legible and clear of the figure?
- CONSISTENCY: is it the same character (colour/build/accessory) across beats?

Score each dimension 0–10 and overall. List concrete issues, each tied to its beat index with a SPECIFIC, actionable fix (these map to tunable params — pose, action choice, setting, camera). Be terse and concrete. Then call deliver_critique.`,
      toolDescription: "Deliver the structured critique of the stick-figure keyframes.",
      dimensionDocs: {
        readability: "Pose readability 0–10 (is each action unmistakable?).",
        composition: "Composition & safe-area 0–10 (framing, not cut off, balanced).",
        captions: "Caption legibility 0–10 (clear, not overlapping the figure).",
        consistency: "Character consistency 0–10 (same character across beats).",
      },
      fixDoc: "A specific, actionable fix (e.g. 'increase the run stride; the pose reads as standing').",
      errorLabel: "Vision critique",
      mockNote: "Vision critique runs in mock mode (set ANTHROPIC_API_KEY in the render workflow to enable it).",
    },
  );
}
