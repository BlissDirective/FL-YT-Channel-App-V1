import type { ApprovalGate, AutonomyMode, VideoStatus } from "@studio/core";

export type BrandKit = {
  primary: string;
  secondary: string;
  thumbnailStyle: string;
  font: string;
};

/** Operator-chosen recipe for the Custom Full-Auto tier. Hero beats bookend
    the video (start + end); b-roll fills the middle at the standard density.
    A run is paused (not downgraded) when its projected cost exceeds maxUsd. */
export type CustomSpec = {
  heroModel: string;
  brollModel: string;
  heroSec: number;
  brollSec: number;
  /** Hard per-video price cap (USD); overrun pauses and notifies. */
  maxUsd: number;
};

export type Budget = {
  perVideoUsd: number;
  monthlyUsd: number;
};

export type Project = {
  id: string;
  name: string;
  niche: string;
  audience: string;
  angle: string;
  tone: string;
  brand_kit: BrandKit;
  voice_id: string | null;
  voice_name: string | null;
  autonomy: Record<ApprovalGate, AutonomyMode>;
  budget: Budget;
  /** Niche RPM (USD per 1,000 views) — drives estimated revenue. */
  rpm_usd: number;
  status: "active" | "paused";
  /** Opt-in to the nightly auto-idea cron (default off — generate on demand). */
  auto_intelligence: boolean;
  /** Confirm-before-generate threshold for pricey clips (USD; default 3). */
  clip_confirm_usd: number;
  /** Hard per-video budget (USD); the smart-mix downgrades beats to free
      stills/stock rather than exceed it. Default 8 (Platinum/Custom headroom). */
  max_video_usd: number;
  /** Max AI-video accents per video in the economy tier (rest stay
      stills/stock); other tiers scale accent count with length. */
  ai_clip_cap: number;
  /** Saved default recipe for the Custom Full-Auto tier (null until set). */
  custom_spec: CustomSpec | null;
  /** Default number of shorts the "Derive Shorts" modal proposes. */
  derive_shorts_count: number;
  /** Default for the smart (Claude) segment-selection toggle when deriving. */
  derive_shorts_smart: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

/** Long-form vs short-form. Both flavours of short are `kind='short'` rows. */
export type VideoKind = "long" | "short";

/** Offered native-Short target lengths, in seconds. */
export const SHORT_LENGTHS = [30, 60, 120, 180] as const;
export type ShortLength = (typeof SHORT_LENGTHS)[number];

/** Which parent beats a repurposed short was cut from. */
export type ShortSegment = {
  /** Parent ScriptBeat.idx values, contiguous and in order. */
  beats: number[];
  /** Short human label for the segment (e.g. the hook line). */
  label: string;
  /** Hook/description line for the Short (used as the publish description). */
  caption?: string;
};

export type Video = {
  id: string;
  project_id: string;
  idea_id: string | null;
  title: string;
  topic: string;
  status: VideoStatus;
  /** 'long' (default) or 'short'. Drives script targets, tiers, render path. */
  kind: VideoKind;
  /** Repurposed shorts only: the source long-form. Null for native/long. */
  parent_video_id: string | null;
  /** Repurposed shorts only: which parent beats this short is cut from. */
  source_segment: ShortSegment | null;
  format: string;
  target_length_sec: number;
  scheduled_at: string | null;
  youtube_video_id: string | null;
  published_at: string | null;
  /** Shorts only: operator tapped Publish → the render farm uploads the
      staged 9:16 cut to YouTube on its next pass. */
  publish_requested: boolean;
  total_cost_usd: number;
  paused_reason: string | null;
  /** Full Auto: worker advances to render when the last clip lands. */
  auto_finish: boolean;
  /** Kinetic Highlights — opt-in Claude-curated burned-in attention text. */
  enable_highlights: boolean;
  /** Operator-set target count of highlights. 0 = auto density (~1 per 45s). */
  highlight_count: number;
  /** Curated highlights (review-time shape; timing resolved at render). */
  highlights: CuratedHighlight[];
  created_at: string;
  updated_at: string;
};

/** Kinetic-highlight style presets (see packages/render highlight layer). */
export type HighlightPreset =
  | "word-pop"
  | "highlight-box-swipe"
  | "stat-card"
  | "quote-card"
  | "typewriter"
  | "color-flash-pop"
  | "sticker-tag"
  | "underline-swipe";

export type HighlightPosition = "center" | "upper-third" | "lower-third-safe";
export type HighlightIntensity = "subtle" | "med" | "high";

/**
 * A single curated highlight as stored on the video and shown in the review
 * editor. Timestamps are NOT stored here — the render worker resolves
 * beat-local start/end from the beat's ElevenLabs word timings at build time
 * (so highlights stay valid across re-renders and VO changes).
 */
export type CuratedHighlight = {
  id: string;
  /** Beat this highlight is anchored to (ScriptBeat.idx). */
  beatIdx: number;
  /** Punchy on-screen phrase, 2–6 words (rewritten, not verbatim narration). */
  text: string;
  /** Token to box/flash/punch; should appear in the beat's spoken words. */
  emphasisWord?: string;
  stylePreset: HighlightPreset;
  /** Display font family (CSS name), chosen from the project niche. */
  fontFamily: string;
  /** Emphasis colour (defaults to brand primary at render). */
  emphasisColor?: string;
  position: HighlightPosition;
  intensity: HighlightIntensity;
  maxLines: number;
};

export type ScriptBeat = {
  idx: number;
  text: string;
  visualPrompt: string;
  shotType: "hero" | "broll" | "stock";
};

export type Script = {
  id: string;
  video_id: string;
  version: number;
  body: string;
  beats: ScriptBeat[];
  runtime_sec: number | null;
  metadata: {
    titles?: string[];
    description?: string;
    tags?: string[];
    chapters?: { at: number; label: string }[];
  };
  created_at: string;
};

export type Asset = {
  id: string;
  video_id: string;
  kind: "vo" | "clip" | "thumb" | "render" | "captions" | "music";
  storage_path: string;
  provider: string;
  beat_index: number | null;
  meta: Record<string, unknown>;
  cost_usd: number;
  created_at: string;
  /** Display URL resolved at query time (signed storage URL or external). */
  url?: string | null;
};

export type Approval = {
  id: string;
  video_id: string;
  gate: ApprovalGate;
  decision: "approved" | "revision" | "killed" | null;
  decided_by: string | null;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
};

export type CostEntry = {
  id: string;
  project_id: string | null;
  video_id: string | null;
  provider: string;
  description: string;
  usd: number;
  at: string;
};

export type AnalyticsSnapshot = {
  id: string;
  video_id: string;
  captured_at: string;
  views: number;
  likes: number;
  comments: number;
  meta: Record<string, unknown>;
};

export type Insight = {
  id: string;
  project_id: string | null;
  kind: "optimizer" | "scout";
  title: string;
  body: string;
  evidence: Record<string, unknown>;
  proposed_template_kind: string | null;
  proposed_template_body: string | null;
  status: "new" | "applied" | "dismissed";
  applied_template_version: number | null;
  created_at: string;
};

export type Idea = {
  id: string;
  project_id: string;
  title: string;
  angle: string;
  source: Record<string, unknown>;
  score: number | null;
  flag: string | null;
  status: "new" | "approved" | "dismissed";
  created_at: string;
};

export type IntelCompetitor = {
  videoId: string;
  title: string;
  channelTitle: string;
  views: number;
  url: string;
  publishedAt: string;
};

export type Blueprint = {
  works: string[];
  doesnt: string[];
  hooks: { pattern: string; example: string; why: string }[];
  structure: { label: string; targetSec: number; note: string }[];
  pacing: string[];
  gaps: string[];
  titlePatterns: string[];
  thumbnailPatterns: string[];
  angle: string;
};

export type PerceptionNote = {
  t: number;
  sceneDesc: string;
  onScreenText?: string;
  shotType?: string;
  pacingNote?: string;
};

export type Perception = { notes: PerceptionNote[]; transcript: string };

export type ClipJob = {
  id: string;
  video_id: string;
  project_id: string | null;
  beat_idx: number;
  method: "veo-extend" | "stitch" | "stitch-seamless";
  model: string;
  target_sec: number;
  hero_hold: boolean;
  status: "queued" | "running" | "done" | "error";
  result_path: string | null;
  cost_usd: number;
  error: string | null;
  created_at: string;
};

/** True for short-form videos (native or repurposed). */
export function isShort(v: Pick<Video, "kind">): boolean {
  return v.kind === "short";
}

/** True for shorts repurposed from a parent long-form (reuses parent assets). */
export function isDerived(v: Pick<Video, "kind" | "parent_video_id">): boolean {
  return v.kind === "short" && v.parent_video_id != null;
}

export type VideoIntel = {
  id: string;
  project_id: string | null;
  video_id: string | null;
  topic: string;
  competitors: IntelCompetitor[];
  transcript: string | null;
  blueprint: Blueprint;
  status: "queued" | "running" | "done" | "error";
  depth: "quick" | "deep";
  source_url: string | null;
  vouched: boolean;
  perception: Perception | null;
  error: string | null;
  cost_usd: number;
  created_at: string;
};
