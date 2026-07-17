/**
 * Motion craft codex (OpenMontage Remixed list1 #24, list2 #15/#16/#30).
 *
 * Codified motion craft the MVDA reads instead of hand-tuning:
 *  - DISNEY_PRINCIPLES — the 12 principles of animation as a motion rubric the
 *    keyframe/emphasis planner scores against (#15).
 *  - KINETIC_TYPE — named kinetic-typography presets (GSAP-style) for punchy
 *    text moments, each with a timing curve (#24).
 *  - SCENE_MECHANICS — scene types as COMPOSABLE primitives (enter / emphasize
 *    / transition / exit), not a drag-and-drop menu (#16).
 *  - WHITEBOARD_MOVES — a curated named-mocap library for the Ink-Theater
 *    whiteboard engine; the agent PICKS a move, never free-keyframes (#30).
 *
 * Pure data + helpers — deterministic and unit-tested.
 */

// ── Disney's 12 principles as a motion rubric (#15) ───────────────────────
export const DISNEY_PRINCIPLES = [
  "squash_and_stretch",
  "anticipation",
  "staging",
  "straight_ahead_and_pose_to_pose",
  "follow_through_and_overlapping",
  "slow_in_slow_out",
  "arc",
  "secondary_action",
  "timing",
  "exaggeration",
  "solid_drawing",
  "appeal",
] as const;
export type DisneyPrinciple = (typeof DISNEY_PRINCIPLES)[number];

export type MotionParams = {
  /** Easing applied (linear reads robotic). */
  easing: "linear" | "ease" | "ease-in-out" | "spring";
  /** A brief anticipation/wind-up before the main move. */
  hasAnticipation: boolean;
  /** Follow-through / settle after the move. */
  hasFollowThrough: boolean;
  /** Motion travels along an arc, not a straight line. */
  onArc: boolean;
  /** Overshoot/scale beyond the target for punch. */
  exaggeration: number; // 0..1
  durationMs: number;
};

export type MotionCritique = { score: number; met: DisneyPrinciple[]; missing: DisneyPrinciple[]; notes: string[] };

/** Score a motion against the principles most relevant to UI/text motion. Pure. */
export function critiqueMotion(p: MotionParams): MotionCritique {
  const met: DisneyPrinciple[] = [];
  const missing: DisneyPrinciple[] = [];
  const notes: string[] = [];

  if (p.easing !== "linear") met.push("slow_in_slow_out");
  else { missing.push("slow_in_slow_out"); notes.push("Linear easing reads robotic — use ease-in-out or spring."); }

  if (p.hasAnticipation) met.push("anticipation");
  else { missing.push("anticipation"); notes.push("Add a brief wind-up before the main move."); }

  if (p.hasFollowThrough) met.push("follow_through_and_overlapping");
  else missing.push("follow_through_and_overlapping");

  if (p.onArc) met.push("arc");
  else missing.push("arc");

  if (p.exaggeration > 0.1) met.push("exaggeration");
  else missing.push("exaggeration");

  if (p.durationMs >= 180 && p.durationMs <= 900) met.push("timing");
  else { missing.push("timing"); notes.push("Aim for ~180–900ms; too fast/slow breaks readability."); }

  const relevant = 6;
  return { score: Math.round((met.length / relevant) * 100) / 100, met, missing, notes };
}

// ── Kinetic typography presets (#24) ──────────────────────────────────────
export type KineticTypePreset = {
  id: string;
  label: string;
  /** Per-unit (word/char) stagger. */
  staggerMs: number;
  durationMs: number;
  easing: MotionParams["easing"];
  unit: "word" | "char" | "line";
  description: string;
};

export const KINETIC_TYPE: KineticTypePreset[] = [
  { id: "typewriter", label: "Typewriter", staggerMs: 40, durationMs: 60, easing: "linear", unit: "char", description: "Char-by-char reveal for a deliberate line." },
  { id: "word-cascade", label: "Word Cascade", staggerMs: 70, durationMs: 320, easing: "spring", unit: "word", description: "Words spring in one after another — punchy hook." },
  { id: "blur-in", label: "Blur In", staggerMs: 45, durationMs: 500, easing: "ease-in-out", unit: "word", description: "Words de-blur into focus (matches the hero taglines)." },
  { id: "highlight-sweep", label: "Highlight Sweep", staggerMs: 0, durationMs: 600, easing: "ease-in-out", unit: "line", description: "A marker sweep highlights the key phrase." },
  { id: "count-up", label: "Count Up", staggerMs: 0, durationMs: 1200, easing: "ease", unit: "line", description: "A number counts up for a stat moment." },
];

export function getKineticType(id: string): KineticTypePreset | undefined {
  return KINETIC_TYPE.find((k) => k.id === id);
}

/** Total on-screen time to fully reveal `unitCount` units of a preset. Pure. */
export function kineticRevealMs(preset: KineticTypePreset, unitCount: number): number {
  return preset.durationMs + Math.max(0, unitCount - 1) * preset.staggerMs;
}

// ── Scene mechanics codex (#16) ───────────────────────────────────────────
export type MechanicPhase = "enter" | "emphasize" | "transition" | "exit";
export type SceneMechanic = { id: string; phase: MechanicPhase; label: string; composableWith: MechanicPhase[] };

export const SCENE_MECHANICS: SceneMechanic[] = [
  { id: "slide-in", phase: "enter", label: "Slide in", composableWith: ["emphasize", "exit"] },
  { id: "fade-rise", phase: "enter", label: "Fade + rise", composableWith: ["emphasize", "exit"] },
  { id: "pop-scale", phase: "emphasize", label: "Pop scale", composableWith: ["exit", "transition"] },
  { id: "shake", phase: "emphasize", label: "Shake for impact", composableWith: ["exit"] },
  { id: "whip-pan", phase: "transition", label: "Whip pan", composableWith: ["enter"] },
  { id: "crossfade", phase: "transition", label: "Crossfade", composableWith: ["enter"] },
  { id: "slide-out", phase: "exit", label: "Slide out", composableWith: [] },
];

/** Compose a bespoke scene from primitives; validates the phases chain. Pure. */
export function composeScene(mechanicIds: string[]): { ok: boolean; phases: MechanicPhase[]; error?: string } {
  const picked = mechanicIds.map((id) => SCENE_MECHANICS.find((m) => m.id === id)).filter(Boolean) as SceneMechanic[];
  if (picked.length !== mechanicIds.length) return { ok: false, phases: [], error: "Unknown mechanic" };
  const phases = picked.map((m) => m.phase);
  const order: MechanicPhase[] = ["enter", "emphasize", "transition", "exit"];
  for (let i = 1; i < phases.length; i++) {
    if (order.indexOf(phases[i]) < order.indexOf(phases[i - 1])) {
      return { ok: false, phases, error: `${phases[i]} cannot follow ${phases[i - 1]}` };
    }
  }
  return { ok: true, phases };
}

// ── Ink Theater whiteboard move library (#30) ─────────────────────────────
export type WhiteboardMove = { id: string; label: string; durationSec: number; tags: string[] };

/** Curated named mocap moves — the agent PICKS one, never free-keyframes. */
export const WHITEBOARD_MOVES: WhiteboardMove[] = [
  { id: "draw-arrow", label: "Draw an arrow", durationSec: 1.2, tags: ["point", "connect", "cause"] },
  { id: "circle-emphasis", label: "Circle to emphasise", durationSec: 1.0, tags: ["emphasis", "focus"] },
  { id: "sketch-figure", label: "Sketch a stick figure", durationSec: 2.0, tags: ["person", "character", "actor"] },
  { id: "write-label", label: "Hand-write a label", durationSec: 1.5, tags: ["label", "name", "define"] },
  { id: "cross-out", label: "Cross something out", durationSec: 0.8, tags: ["wrong", "myth", "negate"] },
  { id: "checkmark", label: "Draw a checkmark", durationSec: 0.6, tags: ["correct", "confirm", "yes"] },
  { id: "underline", label: "Underline for stress", durationSec: 0.7, tags: ["emphasis", "key"] },
];

/** Pick the best-matching curated move for a beat intent (keyword overlap). Pure. */
export function pickWhiteboardMove(intent: string): WhiteboardMove {
  const words = intent.toLowerCase().split(/\s+/);
  let best = WHITEBOARD_MOVES[0];
  let bestScore = -1;
  for (const m of WHITEBOARD_MOVES) {
    const score = m.tags.filter((t) => words.some((w) => w.includes(t) || t.includes(w))).length;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}
