import "server-only";
import { extractEntity } from "@studio/core";
import { searchStockPhotos } from "./stock";

/**
 * Visual Craft Engine V4 — reference finder for grounded generation.
 *
 * For a factual beat, find a REAL licensed reference (currently Pexels stock)
 * of the beat's entity so its visual is grounded in reality rather than
 * hallucinated. Returns null when nothing licensed is found (mock mode / no key)
 * — the caller then falls back to normal generation, so grounding never blocks.
 */

export type VisualReference = {
  source: "stock" | "intel-frame" | "operator-upload" | "source-image";
  url: string;
  license: string;
  attribution: string;
  entity: string;
};

/** Find a grounding reference for a beat. Best-effort; null when unavailable. */
export async function findReference(opts: {
  beatText: string;
  visualPrompt: string;
  niche: string;
}): Promise<VisualReference | null> {
  const entity = extractEntity(`${opts.beatText} ${opts.visualPrompt}`);
  if (!entity) return null;
  try {
    // Pexels: free, license permits use, attribution appreciated.
    const urls = await searchStockPhotos(`${entity} ${opts.niche}`.trim(), 1);
    const url = urls[0];
    if (!url) return null;
    return {
      source: "stock",
      url,
      license: "pexels",
      attribution: `Reference photo via Pexels (${entity})`,
      entity,
    };
  } catch {
    return null;
  }
}
