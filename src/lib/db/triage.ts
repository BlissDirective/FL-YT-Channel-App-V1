import "server-only";
import { isDirectorMode } from "@studio/core";
import { createClient } from "@/lib/supabase/server";
import { getLibrary, type LibraryItem } from "./library-data";

/**
 * Feed triage (rapid asset processing). Buckets a project's actionable assets so
 * the operator can clear them top-to-bottom with inline quick actions, without
 * opening each one. Reuses the Library's per-asset state (gate / held / ready /
 * failed, QC score, thumbnail) — this is a view over the same primitives, not a
 * second source of truth. Bucketing is a PURE function so it's unit-tested.
 */

export type TriageBucketKey = "approve" | "held" | "ready" | "failed";

export type TriageAsset = {
  videoId: string;
  title: string;
  kind: "long" | "short";
  status: string;
  /** Director console stage (idea/script/visuals/edit/publish), for the chip. */
  stage: "idea" | "script" | "visuals" | "edit" | "publish";
  gateLabel: string | null;
  qcScore: number | null;
  reason: string | null;
  spendUsd: number;
  thumbUrl: string | null;
  bucket: TriageBucketKey;
};

export type TriageBucket = { key: TriageBucketKey; label: string; assets: TriageAsset[] };

export type ProjectTriage = {
  mode: "autonomous" | "director";
  buckets: TriageBucket[];
  needsYouCount: number;
};

const STATUS_STAGE: Record<string, TriageAsset["stage"]> = {
  IDEA: "idea",
  IDEA_APPROVED: "idea",
  SCRIPTING: "script",
  SCRIPT_READY: "script",
  GENERATING_ASSETS: "visuals",
  ASSETS_READY: "visuals",
  ASSEMBLING: "edit",
  FINAL_REVIEW: "edit",
  APPROVED: "publish",
  TRACKING: "publish",
};

const BUCKET_LABEL: Record<TriageBucketKey, string> = {
  approve: "Awaiting your approval",
  held: "Held — needs a fix",
  ready: "Ready to publish",
  failed: "Failed",
};
const BUCKET_ORDER: TriageBucketKey[] = ["approve", "held", "ready", "failed"];

/**
 * Which triage bucket an asset belongs to (pure). Returns null for assets that
 * need nothing from the operator (published/tracking, killed, or mid-work in
 * autonomous mode where the engine is still driving).
 *
 * Autonomous: only surface gate arrivals (approve), holds, ready-to-publish,
 * failures — the engine handles the rest. Director: EVERY non-terminal asset
 * awaits the operator, so a working stage (no gate yet) still lands in
 * "approve" (really "needs your direction").
 */
export function triageBucket(
  item: {
    tile: { section: string | null; awaitingYou: boolean; failed: boolean };
    gateLabel: string | null;
    video: { status: string };
  },
  mode: "autonomous" | "director",
): TriageBucketKey | null {
  const { tile, gateLabel } = item;
  const status = item.video.status;
  if (status === "KILLED" || status === "TRACKING") return null;
  if (tile.failed) return "failed";
  if (tile.section === "ready") return "ready";
  if (mode === "director") {
    // Everything the operator still has to drive.
    if (status === "APPROVED") return "ready";
    // Paused/held with no open gate: a working stage the operator can resume by
    // pressing Generate stays actionable ("approve"); anything else is "held".
    if (tile.awaitingYou && !gateLabel) {
      return status === "GENERATING_ASSETS" || status === "SCRIPTING" || status === "ASSEMBLING"
        ? "approve"
        : "held";
    }
    return "approve"; // idea/script/visuals/edit awaiting direction (incl. gates)
  }
  // Autonomous
  if (gateLabel) return "approve";
  if (tile.awaitingYou) return "held"; // paused/stalled but not at a gate
  return null;
}

export async function getProjectTriage(projectId: string): Promise<ProjectTriage> {
  const supabase = await createClient();
  const { data: proj } = await supabase
    .from("projects")
    .select("pipeline_mode")
    .eq("id", projectId)
    .maybeSingle();
  const mode = isDirectorMode(proj as { pipeline_mode?: string } | null) ? "director" : "autonomous";

  const library = await getLibrary(projectId);
  const items: LibraryItem[] = Object.values(library.sections).flat();

  const byBucket = new Map<TriageBucketKey, TriageAsset[]>(
    BUCKET_ORDER.map((k) => [k, []]),
  );
  for (const item of items) {
    const bucket = triageBucket(item, mode);
    if (!bucket) continue;
    const v = item.video;
    byBucket.get(bucket)!.push({
      videoId: v.id,
      title: v.title,
      kind: v.kind === "short" ? "short" : "long",
      status: v.status,
      stage: STATUS_STAGE[v.status] ?? "idea",
      gateLabel: item.gateLabel,
      qcScore: item.qcScore,
      reason: item.awaitingLabel ?? item.stalled?.label ?? null,
      spendUsd: Number(v.total_cost_usd ?? 0),
      thumbUrl: item.thumbUrl,
      bucket,
    });
  }

  const buckets: TriageBucket[] = BUCKET_ORDER.map((key) => ({
    key,
    label: BUCKET_LABEL[key],
    assets: byBucket.get(key)!,
  })).filter((b) => b.assets.length > 0);

  const needsYouCount = buckets.reduce((n, b) => n + b.assets.length, 0);
  return { mode, buckets, needsYouCount };
}

/** Lightweight count-only query for the nav badge (no thumbnails/QC joins). */
export async function getNeedsYouCount(projectId: string): Promise<number> {
  const { needsYouCount } = await getProjectTriage(projectId);
  return needsYouCount;
}
