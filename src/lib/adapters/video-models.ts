/**
 * Video-generation model registry (Phase B). One place to add/retire models;
 * the UI renders cost + quality straight from here so the operator picks the
 * best model per segment. fal.ai reaches Kling / Veo / Seedance through the one
 * FAL_KEY.
 *
 * Endpoint slugs are PINNED against fal's live catalog (Jun 2026). Per-second
 * prices are estimates for the ledger; fal bills per its own schedule.
 *   - Seedance 2.0 Fast : bytedance/seedance-2.0/fast/image-to-video  (4–15s)
 *   - Seedance 2.0      : bytedance/seedance-2.0/image-to-video       (4–15s)
 *   - Kling v2.5-turbo  : fal-ai/kling-video/v2.5-turbo/pro/image-to-video ($0.35/5s +$0.07/s)
 *   - Veo 3.1           : fal-ai/veo3.1/image-to-video                (4 / 6 / 8s)
 */

export type VideoQuality = "draft" | "standard" | "premium";

/** How a model wants the `duration` value encoded in the request. */
export type DurationStyle = "num" | "str" | "secs"; // 8 | "8" | "8s"

export type VideoModel = {
  id: string;
  label: string;
  /** fal endpoint for image-to-video (preferred — from our own keyframe). */
  i2v: string;
  /** fal endpoint for text-to-video (no keyframe). */
  t2v: string;
  usdPerSec: number;
  quality: VideoQuality;
  minDurationSec: number;
  maxDurationSec: number;
  /** Discrete allowed durations (e.g. Veo 4/6/8); free min..max when absent. */
  durations?: number[];
  durationStyle: DurationStyle;
  audio: boolean;
  bestFor: string;
};

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "seedance-2-fast",
    label: "Seedance 2.0 Fast",
    i2v: "bytedance/seedance-2.0/fast/image-to-video",
    t2v: "bytedance/seedance-2.0/fast/text-to-video",
    usdPerSec: 0.022,
    quality: "draft",
    minDurationSec: 4,
    maxDurationSec: 15,
    durationStyle: "num",
    audio: false,
    bestFor: "Cheap, fast b-roll — the default for most beats",
  },
  {
    id: "seedance-2",
    label: "Seedance 2.0",
    i2v: "bytedance/seedance-2.0/image-to-video",
    t2v: "bytedance/seedance-2.0/text-to-video",
    usdPerSec: 0.07,
    quality: "standard",
    minDurationSec: 4,
    maxDurationSec: 15,
    durationStyle: "num",
    audio: true,
    bestFor: "Top all-round quality, optional audio; hero beats",
  },
  {
    id: "kling-2-5-turbo",
    label: "Kling v2.5-turbo Pro",
    i2v: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    t2v: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
    usdPerSec: 0.07, // $0.35 / 5s, +$0.07 per extra second
    quality: "standard",
    minDurationSec: 5,
    maxDurationSec: 10,
    durations: [5, 10],
    durationStyle: "str",
    audio: false,
    bestFor: "Crisp motion, 5s or 10s clips",
  },
  {
    id: "veo-3-1",
    label: "Veo 3.1",
    i2v: "fal-ai/veo3.1/image-to-video",
    t2v: "fal-ai/veo3.1",
    usdPerSec: 0.4,
    quality: "premium",
    minDurationSec: 4,
    maxDurationSec: 8,
    durations: [4, 6, 8],
    durationStyle: "secs",
    audio: true,
    bestFor: "Premium; native synced dialogue — signature shots only",
  },
];

export function getVideoModel(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

/** Snap a requested duration to what the model actually accepts. */
export function clampDuration(model: VideoModel, n: number): number {
  if (model.durations?.length) {
    return model.durations.reduce(
      (best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best),
      model.durations[0],
    );
  }
  return Math.max(model.minDurationSec, Math.min(Math.round(n), model.maxDurationSec));
}

/** Encode the duration the way the model's API expects it. */
export function encodeDuration(model: VideoModel, n: number): string | number {
  const d = clampDuration(model, n);
  if (model.durationStyle === "secs") return `${d}s`;
  if (model.durationStyle === "str") return String(d);
  return d;
}

/** Portfolio-wide monthly ceiling on AI video generation (operator-set). */
export const VIDEO_MONTHLY_CAP_USD = 100;

/** Ledger provider tag for generated video, used by the cap query. */
export const VIDEO_PROVIDER = "fal-video";

export function estimateClipCost(model: VideoModel, durationSec: number): number {
  return Math.round(model.usdPerSec * clampDuration(model, durationSec) * 100) / 100;
}
