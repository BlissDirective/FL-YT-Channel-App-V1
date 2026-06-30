import type { ApprovalGate, AutonomyMode, VideoStatus } from "@studio/core";
import type { FrameCritique, StickCast } from "@/lib/stick-types";

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
  /** This project's own YouTube channel OAuth refresh token (publishes here
      instead of the global default channel). Null = use the default channel. */
  youtube_refresh_token: string | null;
  /** Operator label for the connected channel (display only). */
  youtube_channel_title: string | null;
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
  /** 'footage' (AI clips/stock) or 'stick' (programmatic stick-figure render). */
  visual_style: "footage" | "stick";
  /** Recurring stick-figure character identity (null → default cast). */
  stick_cast: StickCast | null;
  /** Which auto-fix strategy runs for this channel (off until chosen). */
  autofix_loop: AutofixLoop;
  /** Master on/off for the automatic auto-fix loop on this channel. */
  autofix_enabled: boolean;
  /** Trigger score, max re-renders, and per-video spend cap. */
  autofix_config: AutofixConfig;
  /** Per-project learned memory (compounds across videos). */
  autofix_memory: AutofixMemory;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

// ── Auto-Fix Loop ─────────────────────────────────────────────────────
// A self-improving vision optimizer. Two pluggable strategies chosen per
// channel; see docs/Auto-Fix-Loop.md.

/** 'off' = no loop · 'animation' = Remotion/stick · 'aiclip' = AI image/clip. */
export type AutofixLoop = "off" | "animation" | "aiclip";

export type AutofixConfig = {
  /** A video scoring below this (0–10) gets a fix pass; at/above passes through. */
  threshold: number;
  /** Max re-renders before holding the video for manual review. */
  maxRenders: number;
  /** Hard per-video spend cap (USD) for the whole loop (vision + re-renders). */
  spendCapUsd: number;
  /** How many mid-beat keyframes the vision critic analyses. "auto" =
      length-scaled (shorts capped lower than long-form); a number forces a fixed
      count. Default "auto". */
  critiqueFrames?: number | "auto";
};

/** Per-project memory: the mechanism behind "improves over time". */
export type AutofixMemory = {
  /** Lessons learned, most-recent first, injected into the critic/fixer. */
  playbook?: string[];
  /** Numeric/string defaults that historically scored well (baked-in priors). */
  priors?: Record<string, number | string>;
  /** Fixes that regressed the score — do not repeat these. */
  antiPatterns?: string[];
  stats?: { runs: number; improved: number; regressed: number; avgDelta: number };
  updatedAt?: string;
};

export type AutofixStatus =
  | "idle"
  | "rerendering"
  | "done"
  | "held";

/** The loop's state machine for one video (stored on videos.autofix_state). */
export type AutofixState = {
  status?: AutofixStatus;
  /** Which loop drove it (snapshot of the project setting at run time). */
  loop?: AutofixLoop;
  /** Number of re-renders triggered so far. */
  attempts?: number;
  bestScore?: number | null;
  lastScore?: number | null;
  /** The vision_review.at we last acted on (so we don't re-consume a critique). */
  actedOnAt?: string | null;
  /** Cumulative loop spend on this video (USD), against the cap. */
  spentUsd?: number;
  history?: AutofixAttempt[];
};

export type AutofixAttempt = {
  attempt: number;
  fromScore: number;
  toScore?: number;
  changes: string[];
  at: string;
};

/** Audit row — one per fix attempt (autofix_runs table). */
export type AutofixRun = {
  id: string;
  project_id: string;
  video_id: string;
  loop: Exclude<AutofixLoop, "off">;
  attempt: number;
  tier: "tier1" | "tier2";
  from_score: number | null;
  to_score: number | null;
  changes: string[];
  cost_usd: number;
  status: "applied" | "improved" | "regressed" | "held" | "error";
  note: string | null;
  created_at: string;
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
  /** Stick Studio Tier-1 vision critique of the rendered keyframes (null until
      the farm runs the frame-critic). */
  vision_review: FrameCritique | null;
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
  /** Render word-window captions. Default true; turn off to avoid clutter
      when Kinetic Highlights are on. */
  enable_captions: boolean;
  /** Build & Post: the batch run this video belongs to (null = made manually). */
  build_run_id: string | null;
  /** Absolute release time for auto-publish (null = ASAP / all-at-once). */
  scheduled_publish_at: string | null;
  /** This video publishes itself when its slot is due. */
  auto_publish: boolean;
  /** Gates auto-approve (QC-gated) for this video — a fully-automatic run. */
  auto_pilot_run: boolean;
  /** Privacy chosen for auto-publish (public|unlisted), set from final QC. */
  publish_privacy: string | null;
  /** Per-asset auto-fix override: null = inherit project, true/false = force. */
  autofix_enabled: boolean | null;
  /** Auto-fix loop state machine for this video. */
  autofix_state: AutofixState;
  /** The Auto Pilot Operator run that seeded this video (null = made another way).
      Operator-owned videos hold for approval rather than auto-publishing. */
  operator_run_id: string | null;
  /** Operator approval state (Telegram notify → approve/skip / auto-approve). */
  operator_review: OperatorReview;
  created_at: string;
  updated_at: string;
};

/** Per-video operator approval state (videos.operator_review). */
export type OperatorReview = {
  /** When the Telegram approval/review message was sent. */
  notifiedAt?: string;
  /** FINAL QC score the card carried (for the auto-approve bar). */
  qc?: number;
  /** Operator decision; absent = still awaiting. */
  decided?: "approved" | "skipped";
  /** Who decided: 'telegram' | 'auto' | 'app'. */
  by?: string;
  /** Guardrails held this video for manual review (failed editorial guard or
      below the quality floor) — never auto-approved. */
  hold?: boolean;
  holdReason?: string;
  /** Editorial-guard caution flags shown on the approval card. */
  caution?: string[];
  /** Caution-flagged → require a manual tap (no auto-approve). */
  noAuto?: boolean;
};

// ── Auto Pilot Operator ───────────────────────────────────────────────
// A per-channel supervisor; see docs/Auto-Pilot-Operator-build-plan.md.

export type OperatorStatus = "active" | "paused" | "stopped";

/** Tunables stored on operator_runs.config (all optional → sane defaults). */
export type OperatorConfig = {
  /** Daily posting slot (wall-clock) and its time zone. */
  postingHour?: number;
  postingTz?: string;
  /** Max videos seeded per local day (cadence ceiling; 1 to start). */
  dailyCap?: number;
  /** Target share of Shorts in the format mix (0–1; 0.75 = 75% shorts). */
  mixShortsPct?: number;
  /** Hard per-video spend ceilings by format. */
  shortsCapUsd?: number;
  longCapUsd?: number;
  /** Build & Post tier per format (cheap stack by default). */
  shortsTier?: string;
  longTier?: string;
  /** Length bounds (seconds) per format. */
  shortLenMin?: number;
  shortLenMax?: number;
  longLenMin?: number;
  longLenMax?: number;
  /** Auto-approve a held video after this many hours if QC clears the bar. */
  autoApproveHours?: number;
  autoApproveQc?: number;
  /** Below this QC the video is held for manual review, never offered for
      one-tap approval (quality floor). */
  publishFloorQc?: number;
  /** Opt-in cadence ramp: raise the daily cap as the channel matures/performs. */
  rampEnabled?: boolean;
  /** Hard ceiling on the daily cap when ramping (ban-safe). */
  maxDailyCap?: number;
  /** Topic taxonomy override for the dedup/coverage planner. */
  taxonomy?: string[];
  thumbStyle?: string;
  /** Last weekly digest send (ISO) — internal bookkeeping. */
  lastDigestAt?: string;
  /** Last analytics pull (ISO) — internal bookkeeping. */
  lastAnalyticsAt?: string;
  /** Learned performance strategy from real YouTube Analytics (Phase D). */
  strategy?: OperatorStrategy;
  /** 30-day living content calendar (planned upfront, adapts to performance). */
  calendar?: CalendarSlot[];
  /** Autonomy level (Tier 8A). 'copilot' auto-approves only high-QC videos and
      holds the rest for review; 'autopilot' auto-approves + auto-publishes the
      moment the quality gates pass (no aging, no Telegram requirement). */
  autonomy?: "copilot" | "autopilot";
};

/** One planned slot in the 30-day content calendar. */
export type CalendarSlot = {
  /** 1-based day in the cycle. */
  day: number;
  format: VideoKind;
  subtopic: string;
  title: string;
  angle: string;
  /** Reserved budget for this slot (per-format) so long-form isn't starved late. */
  reservedUsd: number;
  /** Production tier assigned by the budget allocator (Tier 8B). */
  tier?: string;
  /** Estimated clip-cost (USD) for the assigned tier — used for $60 planning. */
  estUsd?: number;
  /** Tentpole priority 0..1 (LLM-proposed) — drives tier upgrades. */
  priority?: number;
  status: "planned" | "seeded" | "done" | "skipped";
  /** The video produced from this slot, once seeded. */
  videoId?: string;
};

/** What the channel's real analytics say is working — feeds topic planning and
    the monetization mix tilt. */
export type OperatorStrategy = {
  /** Subtopics ranked best-performing first (retention × reach). */
  topSubtopics?: string[];
  /** Per-format performance for the mix decision. */
  formatPerf?: {
    short?: { watchMin: number; subs: number; views: number; n: number };
    long?: { watchMin: number; subs: number; views: number; n: number };
  };
  /** Channel rollups (recent window + YPP progress). */
  channel?: {
    subs: number;
    watchHours365: number;
    views90: number;
    subsGained90: number;
    retentionPct: number;
    ctr: number;
    /** Operator Shorts' views in the recent window (toward the 10M Shorts path). */
    shortsViews90?: number;
  };
  updatedAt?: string;
};

/** Auto Pilot Operator activity-log entry (operator_events). */
export type OperatorEvent = {
  id: string;
  project_id: string;
  operator_run_id: string | null;
  kind: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export type OperatorRun = {
  id: string;
  project_id: string;
  status: OperatorStatus;
  /** Anchor of the current 30-day budget cycle (rolls forward in 30-day steps). */
  cycle_start: string;
  cycle_budget_usd: number;
  config: OperatorConfig;
  created_at: string;
  updated_at: string;
};

/** Build & Post run record — one "Build & Post" launch (1–6 videos, one config). */
export type BuildRunStatus =
  | "planning"
  | "generating"
  | "scheduled"
  | "publishing"
  | "done"
  | "held"
  | "paused"
  | "cancelled";

export type BuildRun = {
  id: string;
  project_id: string;
  status: BuildRunStatus;
  count: number;
  kind: VideoKind;
  length_min_sec: number;
  length_max_sec: number;
  tier: string;
  custom_spec: CustomSpec | null;
  thumb_style: string;
  qc_floor: number;
  qc_public: number;
  schedule_mode: "all_at_once" | "multi_day" | "staggered";
  schedule_cfg: Record<string, unknown>;
  idea_source: "existing" | "research";
  est_cost_usd: number;
  created_at: string;
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

/** Per-beat camera motion the render layer applies to stills/clips (art-director). */
export const BEAT_MOTIONS = ["zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up", "static"] as const;
export type BeatMotion = (typeof BEAT_MOTIONS)[number];

export type ScriptBeat = {
  idx: number;
  text: string;
  visualPrompt: string;
  shotType: "hero" | "broll" | "stock";
  /** Art-director camera motion (undefined → render default zoom-in). */
  motion?: BeatMotion;
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
