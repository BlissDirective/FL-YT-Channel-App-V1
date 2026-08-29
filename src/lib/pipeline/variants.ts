import type { ScriptBeat } from "@/lib/db/types";

/**
 * Hook-variant fan-out (GTM Video Studio) — pure helpers (no I/O).
 *
 * The A/B unit of a performance creative is the HOOK: same offer, same
 * mechanism/proof body, a genuinely different first-3-seconds angle. The
 * writer already delivers alternate hook/title options (metadata.titles,
 * strongest first — see templates.ts "3 hook/title variants"); this module
 * turns one approved script into N variant scripts that differ ONLY in beat 0.
 *
 * Sharing every beat except the hook is deliberate: the asset stage's
 * changed-beat-only regeneration (content-hash cache in engine.ts) then
 * reuses VO and visuals for beats 1..n across all variants, so an N-variant
 * fan-out costs roughly one extra hook beat per variant — not N full videos.
 *
 * Wiring seam: the engine derives sibling videos the same way derived Shorts
 * ride `parent_video_id` — each variant becomes a child video whose script is
 * `variant.beats` and whose title is `variantAdName(baseTitle, variant.key)`.
 */

export type HookVariant = {
  /** Stable variant key: "A" is the original, then "B", "C", … */
  key: string;
  /** Short label for cards and ad-platform naming. */
  label: string;
  /** The hook text this variant opens on (beat 0). */
  hook: string;
  /** Full beat list — beat 0 swapped, beats 1..n identical to the original. */
  beats: ScriptBeat[];
};

/** Total variants (original included) a fan-out produces by default. */
export const DEFAULT_VARIANT_CAP = 3;
/** Hard ceiling — spend safety no matter what the caller passes. */
export const MAX_VARIANT_CAP = 6;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Plan the hook-variant fan-out for one approved script.
 *
 *  - Variant "A" is always the original script, untouched.
 *  - Each usable alternate hook (non-empty, deduped, distinct from the
 *    original hook) becomes "B", "C", … with ONLY beat 0's text swapped —
 *    the visual direction and every later beat are shared by reference so
 *    downstream content-hash caches see them as unchanged.
 *  - Capped at `max` total variants (default 3, hard ceiling 6).
 *
 * Returns [] for an empty script (nothing to vary).
 */
export function planHookVariants(opts: {
  beats: ScriptBeat[];
  /** Writer-delivered alternate hooks, strongest first. */
  altHooks: string[];
  /** Total variants including the original. Clamped to [1, MAX_VARIANT_CAP]. */
  max?: number;
}): HookVariant[] {
  const { beats } = opts;
  if (!beats || beats.length === 0) return [];
  const cap = Math.max(1, Math.min(MAX_VARIANT_CAP, Math.floor(opts.max ?? DEFAULT_VARIANT_CAP)));

  const original = beats[0];
  const out: HookVariant[] = [
    { key: "A", label: "Variant A (original)", hook: original.text, beats },
  ];

  const seen = new Set<string>([norm(original.text)]);
  for (const raw of opts.altHooks ?? []) {
    if (out.length >= cap) break;
    const hook = raw?.trim();
    if (!hook) continue;
    const key64 = norm(hook);
    if (seen.has(key64)) continue; // dupe of the original or an earlier alt
    seen.add(key64);
    const key = String.fromCharCode(65 + out.length); // B, C, …
    out.push({
      key,
      label: `Variant ${key}`,
      hook,
      // Beat 0 swapped; the hook keeps the original's visual direction (the
      // presenter/product open), and beats 1..n are shared BY REFERENCE.
      beats: [{ ...original, text: hook }, ...beats.slice(1)],
    });
  }
  return out;
}

/** Ad-platform-friendly name for a variant creative. */
export function variantAdName(baseTitle: string, key: string): string {
  const base = baseTitle?.trim() || "Untitled creative";
  return key === "A" ? base : `${base} — Hook ${key}`;
}

/**
 * Which beats differ from the original plan (asset-stage helper): for a
 * hook variant that's exactly [0]; kept general so a future body-variant
 * (different proof beat, different CTA offer) works unchanged.
 */
export function changedBeatIdxs(variant: HookVariant, original: ScriptBeat[]): number[] {
  const changed: number[] = [];
  const n = Math.max(variant.beats.length, original.length);
  for (let i = 0; i < n; i++) {
    if (variant.beats[i]?.text !== original[i]?.text) changed.push(i);
  }
  return changed;
}
