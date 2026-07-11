import { isVideoClipMeta } from "@studio/core";
import type { EddClipMedia } from "./types";

/**
 * Clip-asset media resolution — the ONE implementation behind the render
 * farm's buildProps/EDD maps AND the app's /edit Player payload, so what the
 * operator previews can never drift from what the farm renders. Callers
 * inject their own signer (service-role worker vs app storage helper);
 * everything else — video/still detection, multi-image sets, programmatic
 * b-roll specs, lottie path signing — is shared. Browser-safe (no node deps).
 */

export type ClipAssetMeta = {
  url?: string;
  stillImage?: boolean;
  isVideo?: boolean;
  heroHold?: boolean;
  durationSec?: number;
  stickScene?: EddClipMedia["stickScene"];
  /** Tier 9 #4 — extra still paths/urls for a multi-image section. */
  images?: string[];
  /** Tier 9.5 — programmatic data-viz spec; render draws the chart. */
  dataViz?: EddClipMedia["dataViz"];
  /** Tier 9.5 — Lottie b-roll spec (url may be a storage path to sign). */
  lottie?: { url?: string; loop?: boolean };
};

export type MediaSigner = (path: string) => Promise<string | null>;

export async function resolveClipMedia(
  clip: { storage_path?: string | null; meta?: unknown } | undefined,
  sign: MediaSigner,
): Promise<EddClipMedia & { heroHold: boolean }> {
  const clipMeta = (clip?.meta ?? {}) as ClipAssetMeta;
  // Generated video clips live in Storage (no meta.url) — sign the path and
  // treat as video. Stills are signed as images. External (Pexels) use url.
  const clipSigned = clip?.storage_path ? await sign(clip.storage_path) : null;
  const isVideoClip = isVideoClipMeta(clipMeta);
  // Tier 9 #4 — resolve extra stills (external urls pass through; storage
  // paths get signed). The primary still leads, so the cross-dissolve always
  // includes the frame the rest of the pipeline already vetted/cached.
  const primaryStill = !isVideoClip ? (clipSigned ?? undefined) : undefined;
  let images: string[] | undefined;
  if (!isVideoClip && clipMeta.images?.length) {
    const extra = await Promise.all(
      clipMeta.images.map((p) => (/^https?:\/\//.test(p) ? Promise.resolve(p) : sign(p))),
    );
    images = [primaryStill, ...extra].filter((u): u is string => Boolean(u));
    if (images.length < 2) images = undefined;
  }
  let lottie: { url: string; loop?: boolean } | undefined;
  if (clipMeta.lottie?.url) {
    lottie = {
      url: /^https?:\/\//.test(clipMeta.lottie.url)
        ? clipMeta.lottie.url
        : ((await sign(clipMeta.lottie.url)) ?? clipMeta.lottie.url),
      loop: clipMeta.lottie.loop,
    };
  }
  return {
    imageUrl: primaryStill,
    images,
    videoUrl: clipMeta.url ?? (clipMeta.isVideo ? (clipSigned ?? undefined) : undefined),
    videoDurationSec: clipMeta.durationSec,
    stickScene: clipMeta.stickScene,
    dataViz: clipMeta.dataViz,
    lottie,
    heroHold: Boolean(clipMeta.heroHold),
  };
}
