import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DecisionAlternative, DecisionKind } from "@/lib/pipeline/decisions";

/** One row of the per-video decision audit trail (#9). */
export type DecisionRow = {
  id: string;
  video_id: string;
  beat_idx: number | null;
  kind: DecisionKind | string;
  choice: string;
  alternatives: DecisionAlternative[];
  confidence: number | null;
  reasoning: string | null;
  cost_usd: number | null;
  params: Record<string, unknown>;
  created_at: string;
};

/** The whole decision trail for a video, newest first. Read-only. */
export async function getDecisions(videoId: string, limit = 200): Promise<DecisionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("decisions")
    .select("id, video_id, beat_idx, kind, choice, alternatives, confidence, reasoning, cost_usd, params, created_at")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as DecisionRow[];
}
