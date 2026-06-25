// Stick Studio — client-safe types + vocabulary for the choreographer's output.
// MUST stay in sync with packages/render/src/stick/types.ts (the render package
// owns rendering and can't import app code; the app owns choreography and can't
// import render code). The DB boundary is jsonb, so only the shapes must agree.

export const STICK_ACTIONS = [
  "idle", "walk", "run", "sneak", "crawl", "climb", "swim", "jump", "dance",
  "point", "wave", "think", "shrug", "facepalm", "lookAround", "reach", "carry",
  "salute", "celebrate", "panic", "kneel", "sit", "type", "push", "drag",
  "throw", "fight", "dodge", "getHit", "fall", "dead",
] as const;
export type StickAction = (typeof STICK_ACTIONS)[number];

export const STICK_SETTINGS = [
  "void", "room", "street", "forest", "cliff", "office", "cave", "ocean",
  "space", "rooftop", "courtroom", "hospital", "subway", "desert", "kitchen",
  "prison",
] as const;
export type Setting = (typeof STICK_SETTINGS)[number];

export const STICK_MOODS = [
  "day", "night", "danger", "calm", "dream", "retro", "warning",
] as const;
export type Mood = (typeof STICK_MOODS)[number];

export const STICK_FX = ["shake", "flash", "speedlines", "impact"] as const;
export type StickFx = (typeof STICK_FX)[number];

export const STICK_PROPS = [
  "none", "phone", "sign", "box", "knife", "bag", "torch",
  "sword", "briefcase", "book", "cup", "mic", "ball", "flag",
] as const;
export type PropKey = (typeof STICK_PROPS)[number];

export const STICK_BUILDS = ["normal", "tall", "short", "heavy", "lanky", "kid"] as const;
export type Build = (typeof STICK_BUILDS)[number];

export const STICK_ACCESSORIES = [
  "none", "hat", "bow", "cap", "beanie", "ponytail", "antenna", "tie", "cape", "crown",
] as const;
export type Accessory = (typeof STICK_ACCESSORIES)[number];

export type Shot = "wide" | "medium" | "close";
export type CameraMove = "none" | "push" | "pull" | "panLeft" | "panRight";

export type StickCast = {
  color: string;
  line: number;
  headR: number;
  scale: number;
  build: Build;
  accessory: Accessory;
};

export type StickActor = {
  id?: string;
  action: StickAction;
  x?: number;
  facing?: "l" | "r";
  prop?: PropKey;
  cast?: Partial<StickCast>;
  say?: string;
  think?: string;
};

export type StickScene = {
  setting: Setting;
  shot?: Shot;
  mood?: Mood;
  camera?: { panX?: number; zoom?: number; move?: CameraMove };
  actors: StickActor[];
  fx?: StickFx[];
};

export const DEFAULT_STICK_CAST: StickCast = {
  color: "#16140F",
  line: 9,
  headR: 22,
  scale: 1,
  build: "normal",
  accessory: "none",
};
