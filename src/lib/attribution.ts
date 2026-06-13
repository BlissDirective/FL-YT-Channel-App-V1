import type { Asset } from "@/lib/db/types";

/**
 * Attribution ledger (Phase 6.5). Derived from the clip assets a video
 * uses — no separate table needed, the credit lives with the asset it
 * describes. CC-BY (and any attribution-required licence) must be credited;
 * the Publish Kit injects this block into the YouTube description.
 */

export type Attribution = {
  beatIndex: number | null;
  title: string;
  author: string;
  licenseLabel: string;
  licenseUrl?: string;
  sourceUrl?: string;
  provider: string;
  requiresAttribution: boolean;
};

type ClipMeta = {
  author?: string;
  sourceProvider?: string;
  sourceUrl?: string;
  credit?: string;
  fromLibrary?: boolean;
  license?: { label?: string; url?: string; requiresAttribution?: boolean };
};

/** Every licensed clip in a video that carries source/licence metadata. */
export function attributionsFromAssets(assets: Asset[]): Attribution[] {
  return assets
    .filter((a) => a.kind === "clip")
    .map((a) => ({ a, m: (a.meta ?? {}) as ClipMeta }))
    .filter(({ m }) => m.fromLibrary || m.license || m.credit)
    .map(({ a, m }) => ({
      beatIndex: a.beat_index,
      title: (a.meta as { title?: string }).title ?? `Beat ${(a.beat_index ?? 0) + 1} footage`,
      author: m.author ?? m.credit ?? "Unknown",
      licenseLabel: m.license?.label ?? "Pexels License",
      licenseUrl: m.license?.url,
      sourceUrl: m.sourceUrl,
      provider: m.sourceProvider ?? a.provider,
      requiresAttribution: m.license?.requiresAttribution ?? false,
    }));
}

/** The credits block for a YouTube description. Only attribution-required
    licences need listing; returns "" when nothing must be credited. */
export function buildAttributionBlock(assets: Asset[]): string {
  const required = attributionsFromAssets(assets).filter((a) => a.requiresAttribution);
  if (required.length === 0) return "";
  const lines = required.map((a) => {
    const lic = a.licenseUrl ? `${a.licenseLabel} (${a.licenseUrl})` : a.licenseLabel;
    const src = a.sourceUrl ? ` — ${a.sourceUrl}` : "";
    return `• "${a.title}" by ${a.author}, ${lic}${src}`;
  });
  return ["Credits / attributions:", ...lines].join("\n");
}
