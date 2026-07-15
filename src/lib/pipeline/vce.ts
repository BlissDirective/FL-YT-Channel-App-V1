import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Visual Craft Engine feature flags (app_settings key 'vce'). Every VCE system
 * ships DARK (default off) so it can land, be validated in mock, then enabled.
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
