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
