import type { ApprovalGate, AutonomyMode, VideoStatus } from "@studio/core";

export type BrandKit = {
  primary: string;
  secondary: string;
  thumbnailStyle: string;
  font: string;
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
      stills/stock rather than exceed it. Default 4. */
  max_video_usd: number;
  /** Max AI-video beats per video in the economy mix (rest stay stills/stock). */
  ai_clip_cap: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type Video = {
  id: string;
  project_id: string;
  idea_id: string | null;
  title: string;
  topic: string;
  status: VideoStatus;
  format: string;
  target_length_sec: number;
  scheduled_at: string | null;
  youtube_video_id: string | null;
  published_at: string | null;
  total_cost_usd: number;
  paused_reason: string | null;
  /** Full Auto: worker advances to render when the last clip lands. */
  auto_finish: boolean;
  created_at: string;
  updated_at: string;
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
