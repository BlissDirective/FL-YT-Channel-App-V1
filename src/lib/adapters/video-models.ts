/**
 * Video-generation model registry (Phase B). One place to add/retire models;
 * the UI renders cost + quality straight from here so the operator picks the
 * best model per segment. fal.ai reaches Kling / Veo / Seedance through the one
 * FAL_KEY.
 *
 * Pricing & endpoint slugs are INDICATIVE (fal's catalog + rates shift) — verify
 * against fal at integration time; the cost ledger records `durationSec ×
 * usdPerSec` as the estimate.
 */

export type VideoQuality = "draft" | "standard" | "premium";

export type VideoModel = {
  id: string;
  label: string;
  /** fal endpoint for image-to-video (preferred — from our own keyframe). */
  i2v: string;
  /** fal endpoint for text-to-video (no keyframe). */
  t2v: string;
  usdPerSec: number;
  quality: VideoQuality;
  maxDurationSec: number;
  audio: boolean;
  bestFor: string;
};

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "seedance-2-fast",
    label: "Seedance 2.0 Fast",
    i2v: "fal-ai/bytedance/seedance/v2/fast/image-to-video",
    t2v: "fal-ai/bytedance/seedance/v2/fast/text-to-video",
    usdPerSec: 0.022,
    quality: "draft",
    maxDurationSec: 10,
    audio: false,
    bestFor: "Cheap, fast b-roll — the default for most beats",
  },
  {
    id: "seedance-2",
    label: "Seedance 2.0",
    i2v: "fal-ai/bytedance/seedance/v2/image-to-video",
    t2v: "fal-ai/bytedance/seedance/v2/text-to-video",
    usdPerSec: 0.07,
    quality: "standard",
    maxDurationSec: 12,
    audio: true,
    bestFor: "Top all-round quality; hero beats",
  },
  {
    id: "kling-3",
    label: "Kling 3.0",
    i2v: "fal-ai/kling-video/v3/standard/image-to-video",
    t2v: "fal-ai/kling-video/v3/standard/text-to-video",
    usdPerSec: 0.05,
    quality: "standard",
    maxDurationSec: 15,
    audio: true,
    bestFor: "4K/60fps, longest clips, lip-sync",
  },
  {
    id: "veo-3-1",
    label: "Veo 3.1",
    i2v: "fal-ai/veo3/image-to-video",
    t2v: "fal-ai/veo3",
    usdPerSec: 0.4,
    quality: "premium",
    maxDurationSec: 8,
    audio: true,
    bestFor: "Premium; native synced dialogue — signature shots only",
  },
];

export function getVideoModel(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

/** Portfolio-wide monthly ceiling on AI video generation (operator-set). */
export const VIDEO_MONTHLY_CAP_USD = 100;

/** Ledger provider tag for generated video, used by the cap query. */
export const VIDEO_PROVIDER = "fal-video";

export function estimateClipCost(model: VideoModel, durationSec: number): number {
  return Math.round(model.usdPerSec * durationSec * 100) / 100;
}
