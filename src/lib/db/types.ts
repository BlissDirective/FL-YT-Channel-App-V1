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
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
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
