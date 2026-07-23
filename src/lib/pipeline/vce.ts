import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Visual Craft Engine — INVISIBLE UNDER-LAYER (ClickMax transition decision 5).
 *
 * VCE has no user-facing surface: the settings card was removed and the engine
 * decides internally when each stage runs. This module is the single
 * activation policy. Per-stage policy is currently: all stages OFF pending the
 * measured activation audit (QC delta vs cost/latency per stage needs live
 * provider keys to run; see plan §4.5) — flip a stage's default here once its
 * measured delta justifies its cost, not via any UI.
 *
 * The app_settings 'vce' override remains as an internal operator escape
 * hatch (setVceFlags server action), useful for A/B measurement runs.
 * `compositor` (V5) is documented-dead: no engine site reads it.
 *
 * With all flags off the pipeline behaves byte-identically to pre-VCE — the
 * flag-off invariance the cross-cutting test suite pins.
 */

type Db = ReturnType<typeof createAdminClient>;

export type VceFlags = {
  bible: boolean; // V1 — Visual Bible conditioning
  router: boolean; // V2 — Shot decomposition + Medium Router
  refine: boolean; // V3 — Per-Beat Refine Loop
  grounding: boolean; // V4 — Grounded Generation
  compositor: boolean; // V5 — Remotion scene vocabulary + overlays
};

export const VCE_DEFAULTS: VceFlags = {
  bible: false,
  router: false,
  refine: false,
  grounding: false,
  compositor: false,
};

let cached: { at: number; flags: VceFlags } | null = null;

export function invalidateVceCache(): void {
  cached = null;
}

export async function getVceFlags(db?: Db): Promise<VceFlags> {
  if (cached && Date.now() - cached.at < 60_000) return cached.flags;
  const supabase = db ?? createAdminClient();
  const flags = { ...VCE_DEFAULTS };
  try {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "vce").maybeSingle();
    const v = (data?.value ?? {}) as Partial<VceFlags>;
    for (const k of Object.keys(flags) as (keyof VceFlags)[]) {
      if (typeof v[k] === "boolean") flags[k] = v[k] as boolean;
    }
  } catch {
    /* missing row/table → all off (today's behavior) */
  }
  cached = { at: Date.now(), flags };
  return flags;
}
