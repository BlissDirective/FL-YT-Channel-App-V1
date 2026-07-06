/**
 * UI-Redesign v2 feature flag (Fable-5-UI-Redesign.md, Phases 1–6).
 *
 * OFF (default): the existing UI is byte-identical; the new surfaces
 * (Library / Autopilot / Feed / Asset Canvas additions) are reachable only
 * by direct URL, so both UIs can be exercised side by side.
 * ON (NEXT_PUBLIC_UI_V2=1): navigation routes to the new surfaces.
 * Phase 7 removes the flag and the old surfaces together.
 */
export function isUiV2(): boolean {
  return process.env.NEXT_PUBLIC_UI_V2 === "1";
}
