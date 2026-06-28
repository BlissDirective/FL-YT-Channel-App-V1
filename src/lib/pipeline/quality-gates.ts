import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQcLive } from "@/lib/adapters/qc";
import { isFalLive } from "@/lib/adapters/fal";

/**
 * Tier-1 upfront quality gates (move gates BEFORE spend). All three gates —
 * the idea-score gate, the script-stage editorial gate, and the FLUX prompt
 * pre-check — are ALWAYS ON. The idea-score floor stays tunable (app_settings
 * key 'quality_gates' → { ideaFloor: number }); absent → DEFAULT_IDEA_FLOOR.
 *
 * Fail-closed policy: when a PAID asset provider is live but the QC/grading
 * model is mocked, we are about to pay to generate things we cannot judge — so
 * the gate blocks that spend rather than waving it through. When everything is
 * mocked (no key anywhere) there is no real spend, so the gates pass through.
 */

type Db = ReturnType<typeof createAdminClient>;

export const DEFAULT_IDEA_FLOOR = 6.0;

export type QualityGateConfig = {
  /** Always true — the gates are not optional. Kept for call-site clarity. */
  enabled: boolean;
  ideaFloor: number;
};

/** Resolve the quality-gate config. Gates are always enabled; only the idea
    floor is overridable via app_settings (no UI — tune in the DB if needed). */
export async function getQualityGateConfig(db?: Db): Promise<QualityGateConfig> {
  const supabase = db ?? createAdminClient();
  let ideaFloor = DEFAULT_IDEA_FLOOR;
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "quality_gates")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<QualityGateConfig>;
    if (typeof v.ideaFloor === "number") ideaFloor = v.ideaFloor;
  } catch {
    /* missing row / table → keep the default floor */
  }
  return { enabled: true, ideaFloor };
}

/**
 * Fail-closed guard: true when a paid provider (fal) is live but the grading
 * model (Anthropic/QC) is NOT — i.e. we'd be spending on generation we can't QC.
 * Callers should block paid generation in that case.
 */
export function failClosedBlocksSpend(_cfg: QualityGateConfig): boolean {
  return isFalLive() && !isQcLive();
}
