import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isQcLive } from "@/lib/adapters/qc";
import { isFalLive } from "@/lib/adapters/fal";

/**
 * Tier-1 upfront quality gates (move gates BEFORE spend). All three new gates —
 * the idea-score gate, the script-stage editorial gate, and the FLUX prompt
 * pre-check — are OPT-IN behind a single app-level flag so they can be rolled out
 * gradually. Default OFF: behaviour is identical to before until switched on.
 *
 * Flag lives in app_settings under key 'quality_gates':
 *   { enabled: boolean, ideaFloor: number }
 *
 * Fail-closed policy (the user's chosen rollout): when the gates are ON and a
 * PAID asset provider is live but the QC/grading model is mocked, we are about to
 * pay to generate things we cannot judge — so the gate blocks that spend rather
 * than waving it through. When everything is mocked (no key anywhere) there is no
 * real spend, so the gates simply pass through.
 */

type Db = ReturnType<typeof createAdminClient>;

export const DEFAULT_IDEA_FLOOR = 6.0;

export type QualityGateConfig = {
  enabled: boolean;
  ideaFloor: number;
};

const OFF: QualityGateConfig = { enabled: false, ideaFloor: DEFAULT_IDEA_FLOOR };

/** Read the opt-in quality-gate config from app_settings (default: disabled). */
export async function getQualityGateConfig(db?: Db): Promise<QualityGateConfig> {
  const supabase = db ?? createAdminClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "quality_gates")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<QualityGateConfig>;
  return {
    enabled: Boolean(v.enabled),
    ideaFloor: typeof v.ideaFloor === "number" ? v.ideaFloor : DEFAULT_IDEA_FLOOR,
  };
}

/**
 * Fail-closed guard: true when the gates are ON, a paid provider (fal) is live,
 * but the grading model (Anthropic/QC) is NOT — i.e. we'd be spending on
 * generation we can't QC. Callers should block paid generation in that case.
 */
export function failClosedBlocksSpend(cfg: QualityGateConfig): boolean {
  return cfg.enabled && isFalLive() && !isQcLive();
}
