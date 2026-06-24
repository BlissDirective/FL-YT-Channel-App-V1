// Stick Studio — shared types for the programmatic stick-figure visual backend.
// Phase 0: consumed by the rig + previews. Phase 2 mirrors these in the app as
// the choreographer's output schema.

export type StickAction =
  // locomotion
  | "idle"
  | "walk"
  | "run"
  | "sneak"
  | "crawl"
  | "climb"
  | "swim"
  | "jump"
  | "dance"
  // gesture / acting
  | "point"
  | "wave"
  | "think"
  | "shrug"
  | "facepalm"
  | "lookAround"
  | "reach"
  | "carry"
  | "salute"
  | "celebrate"
  | "panic"
  | "kneel"
  | "sit"
  | "type"
  // action / physical
  | "push"
  | "drag"
  | "throw"
  | "fight"
  | "dodge"
  | "getHit"
  | "fall"
  | "dead";

export type Emote = "neutral" | "happy" | "sad" | "angry" | "shock";
export type PropKey = "none" | "phone" | "sign" | "box" | "knife" | "bag" | "torch";
export type Setting =
  | "void"
  | "room"
  | "street"
  | "forest"
  | "cliff"
  | "office"
  | "cave"
  | "ocean"
  | "space"
  | "rooftop"
  | "courtroom"
  | "hospital"
  | "subway"
  | "desert"
  | "kitchen"
  | "prison";
export type StickFx = "shake" | "flash" | "speedlines" | "impact";

/** Recolours the whole frame to set emotional tone. */
export type Mood = "day" | "night" | "danger" | "calm" | "dream" | "retro" | "warning";

/** Body proportions — a cheap way to make distinct characters. */
export type Build = "normal" | "tall" | "short" | "heavy" | "lanky" | "kid";

export type Accessory =
  | "none"
  | "hat"
  | "bow"
  | "cap"
  | "beanie"
  | "ponytail"
  | "antenna"
  | "tie"
  | "cape"
  | "crown";

/** The recurring character's identity — the consistency moat. */
export type StickCast = {
  /** Stroke colour (who the character is). */
  color: string;
  /** Stroke width (overall heft). */
  line: number;
  /** Head radius. */
  headR: number;
  /** Overall size multiplier. */
  scale: number;
  /** Body proportions. */
  build: Build;
  accessory: Accessory;
};

export type StickActor = {
  id?: string;
  action: StickAction;
  emote?: Emote;
  /** Horizontal position, 0..1 across the stage width. */
  x?: number;
  facing?: "l" | "r";
  prop?: PropKey;
  /** Per-actor identity override (a second/third character in the scene). */
  cast?: Partial<StickCast>;
  /** Short speech-bubble line over this actor. */
  say?: string;
  /** Short thought-bubble line over this actor. */
  think?: string;
};

export type CameraMove = "none" | "push" | "pull" | "panLeft" | "panRight";

export type StickScene = {
  setting: Setting;
  /** Framing — drives the base zoom. */
  shot?: "wide" | "medium" | "close";
  mood?: Mood;
  camera?: { panX?: number; zoom?: number; move?: CameraMove };
  actors: StickActor[];
  fx?: StickFx[];
};

export const DEFAULT_CAST: StickCast = {
  color: "#16140F",
  line: 9,
  headR: 22,
  scale: 1,
  build: "normal",
  accessory: "none",
};
