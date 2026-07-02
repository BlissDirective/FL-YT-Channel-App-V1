// Footage (AI-clip / stock) Tier-1 vision critique. Same FrameCritique shape
// as the stick critic (stored on videos.vision_review) so the app + UI handle
// both uniformly; the rubric judges visual relevance, framing, caption
// legibility, and variety instead of pose readability.
//
// Thin config over the shared vision-critique core (Phase 7).

import { critiqueFrames, visionCriticLive, type FrameCritique } from "../vision-critique";

export { visionCriticLive };
export type { FrameCritique };

export type FootageFrame = {
  beatIdx: number;
  /** base64 JPEG (no data: prefix). */
  jpegBase64: string;
  /** "hero" | "broll" | "stock" — what kind of visual this beat uses. */
  shotType: string;
  /** Whether the underlying visual is a motion clip (vs a still). */
  isVideo: boolean;
  text: string;
};

export async function critiqueFootageFrames(opts: {
  title: string;
  frames: FootageFrame[];
}): Promise<FrameCritique> {
  return critiqueFrames(
    opts.title,
    opts.frames.map((f) => ({
      beatIdx: f.beatIdx,
      jpegBase64: f.jpegBase64,
      label: `Beat ${f.beatIdx} (${f.shotType}, ${f.isVideo ? "motion clip" : "still"}) — "${f.text}"`,
    })),
    {
      intro: `You are a senior video editor reviewing keyframe stills from an AI-clip / stock-footage YouTube video titled "__TITLE__". Each image is one beat (a still grabbed mid-beat). Judge it as a faceless footage video — the goal is visuals that clearly support the spoken narration and hold attention.

For each frame, assess:
- VISUAL RELEVANCE & CLARITY: does the visual clearly match and reinforce the beat's narration? Is it on-topic and legible (not muddy, glitchy, or generic filler)?
- COMPOSITION / FRAMING: is the subject well-placed (not awkwardly cropped, balanced, safe-area respected)?
- CAPTIONS: if present, is the on-screen text legible with good contrast? Flag if captions are missing where they'd help.
- VARIETY & CONTINUITY: across beats, do the visuals feel distinct and cohesive (not repetitive, not jarring cuts)?

Score each dimension 0–10 and overall. List concrete issues, each tied to its beat index with a SPECIFIC, actionable fix (re-roll the visual with a better prompt, swap to a more relevant clip, reframe, enable/restyle captions). Be terse and concrete. Then call deliver_critique.`,
      toolDescription: "Deliver the structured critique of the footage keyframes.",
      dimensionDocs: {
        readability: "Visual relevance & clarity 0–10 (does the visual match and reinforce the narration, and read clearly?).",
        composition: "Composition & framing 0–10 (subject placement, balance, safe-area, not awkwardly cropped).",
        captions: "Caption/text legibility 0–10 (readable over the footage, good contrast).",
        consistency: "Visual variety & continuity 0–10 (beats feel distinct and cohesive, not repetitive or jarring).",
      },
      fixDoc: "A specific, actionable fix — e.g. 'the clip is off-topic; re-roll with a prompt showing X', 'reframe to centre the subject', 'enable captions; text is missing'.",
      errorLabel: "Footage vision critique",
      mockNote: "Footage vision critique runs in mock mode (set ANTHROPIC_API_KEY in the render workflow to enable it).",
    },
  );
}
