// Stick Studio — shared types for the programmatic stick-figure visual backend.
// Phase 0: consumed by the rig + StickPreview. Phase 1+ will mirror these in the
// app (src/lib/db/types.ts) as the choreographer's output, like Highlights.

export type StickAction =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "fall"
  | "point"
  | "wave"
  | "sit"
  | "panic"
  | "celebrate"
  | "think"
  | "fight"
  | "crawl"
  | "dead";

export type Emote = "neutral" | "happy" | "sad" | "angry" | "shock";
export type PropKey = "none" | "phone" | "sign" | "box" | "knife";
export type Setting = "void" | "room" | "street" | "forest" | "cliff" | "office";
export type StickFx = "shake" | "flash" | "speedlines";

/** The recurring character's identity — the consistency moat. */
export type StickCast = {
  /** Stroke colour (who the character is). */
  color: string;
  /** Stroke width (build). */
  line: number;
  /** Head radius. */
  headR: number;
  /** Overall size multiplier. */
  scale: number;
  accessory: "none" | "hat" | "bow";
};

export type StickActor = {
  id?: string;
  action: StickAction;
  emote?: Emote;
  /** Horizontal position, 0..1 across the stage width. */
  x?: number;
  facing?: "l" | "r";
  prop?: PropKey;
  /** Per-actor identity override (a second character in the scene). */
  cast?: Partial<StickCast>;
};

export type StickScene = {
  setting: Setting;
  shot?: "wide" | "medium" | "close";
  camera?: { panX?: number; zoom?: number };
  actors: StickActor[];
  fx?: StickFx[];
};

export const DEFAULT_CAST: StickCast = {
  color: "#16140F",
  line: 9,
  headR: 22,
  scale: 1,
  accessory: "none",
};
