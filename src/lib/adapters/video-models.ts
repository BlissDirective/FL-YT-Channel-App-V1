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

/** Which API a model runs on. Absent = fal (every legacy entry). */
export type VideoProvider = "fal" | "higgsfield";

export type VideoModel = {
  id: string;
  label: string;
  /** Provider that serves the endpoints below. Absent = "fal". */
  provider?: VideoProvider;
  /** Endpoint for image-to-video (preferred — from our own keyframe). */
  i2v: string;
  /** Endpoint for text-to-video (no keyframe). */
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
  /** Long-clip model that runs in the background worker (Veo-3.1 extend
      chains base 8s + 7s segments to ~30s). */
  longClip?: boolean;
};

export const VIDEO_MODELS: VideoModel[] = [
  {
    // LOCKED DEFAULT (operator decision, Sep 2026): every AI-video section —
    // hero and b-roll — renders on Cinema Studio 4.0. One endpoint serves both
    // modes: text-to-video without references, reference-to-video when the
    // keyframe rides image_urls. 4–30s native, so long sections need no
    // extend-chaining. Price is Higgsfield's "from" rate; the adapter ledgers
    // the exact /estimate quote when available.
    id: "hf-cinema-studio-4",
    label: "Higgsfield Cinema Studio 4.0",
    provider: "higgsfield",
    i2v: "higgsfield/cinema-studio/4.0",
    t2v: "higgsfield/cinema-studio/4.0",
    usdPerSec: 0.2057,
    quality: "premium",
    minDurationSec: 4,
    maxDurationSec: 30,
    durationStyle: "num",
    audio: true,
    bestFor: "Locked default — cinematic hero & b-roll, camera/lens/genre controls, 4–30s",
  },
  {
    // The other operator-approved lock choice (per project). True
    // image-to-video from our keyframe (image_url = first frame) or
    // text-to-video; 4–30s. Priced at list ($0.2057/s); the promo rate
    // ($0.144/s until 2026-10-01) is picked up by the /estimate quote.
    id: "hf-seedance-2-5",
    label: "Higgsfield Seedance 2.5",
    provider: "higgsfield",
    i2v: "bytedance/seedance-2.5/image-to-video",
    t2v: "bytedance/seedance-2.5/text-to-video",
    usdPerSec: 0.2057,
    quality: "premium",
    minDurationSec: 4,
    maxDurationSec: 30,
    durationStyle: "num",
    audio: true,
    bestFor: "Lock option — keyframe-faithful i2v, native audio, 4–30s",
  },
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
    id: "ltx-2",
    label: "LTX-2 (open, long)",
    i2v: "fal-ai/ltx-2/image-to-video/fast",
    t2v: "fal-ai/ltx-2/text-to-video/fast",
    usdPerSec: 0.04,
    quality: "standard",
    minDurationSec: 6,
    maxDurationSec: 20,
    durationStyle: "num",
    audio: false,
    bestFor: "Open (Apache) · cheap · longest single clip (6–20s) — great b-roll",
  },
  {
    id: "wan-2-2",
    label: "Wan 2.2 (open)",
    i2v: "fal-ai/wan/v2.2-a14b/image-to-video",
    t2v: "fal-ai/wan/v2.2-a14b/text-to-video",
    usdPerSec: 0.08,
    quality: "standard",
    minDurationSec: 5,
    maxDurationSec: 5,
    durations: [5],
    durationStyle: "num",
    audio: false,
    bestFor: "Open (Apache-2.0) · best open quality — no lock-in, self-host later",
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
  {
    id: "veo-3-1-extend",
    label: "Veo 3.1 Extended (long)",
    i2v: "fal-ai/veo3.1/image-to-video",
    t2v: "fal-ai/veo3.1",
    usdPerSec: 0.4,
    quality: "premium",
    minDurationSec: 8,
    maxDurationSec: 30,
    durations: [8, 15, 22, 29], // base 8s + 7s extend segments (fal caps ~30s)
    durationStyle: "secs",
    audio: true,
    bestFor: "Seamless long hero shots (8–29s, native audio) — premium cost",
    longClip: true,
  },
];

/** fal extend endpoint used by the worker to chain Veo segments. */
export const VEO_EXTEND_ENDPOINT = "fal-ai/veo3.1/extend-video";

export function getVideoModel(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function modelProvider(model: Pick<VideoModel, "provider">): VideoProvider {
  return model.provider ?? "fal";
}

// ── Locked defaults (operator decision) ───────────────────────────────

/** The model every AI-video section (hero + b-roll) uses while the lock is on,
    unless the project picked the other approved lock model. */
export const LOCKED_VIDEO_MODEL_ID = "hf-cinema-studio-4";

/** Models a project may lock to (operator decision: Cinema Studio or Seedance 2.5). */
export const LOCKABLE_VIDEO_MODEL_IDS = ["hf-cinema-studio-4", "hf-seedance-2-5"] as const;

/** The project's locked model — its preference when it is an approved lock
    model, else the global default (Cinema Studio 4.0). */
export function resolveLockedModelId(preferred?: string | null): string {
  return preferred && (LOCKABLE_VIDEO_MODEL_IDS as readonly string[]).includes(preferred)
    ? preferred
    : LOCKED_VIDEO_MODEL_ID;
}

/** fal models the lock falls back to (in order) when Higgsfield is down or a
    Higgsfield job fails. Cheapest-reliable first so an outage can't run up a
    premium bill on the fallback provider. */
export const LOCKED_FALLBACK_MODEL_IDS = ["seedance-2", "kling-2-5-turbo", "seedance-2-fast"];

/** The model lock is ON unless explicitly disabled (VIDEO_MODEL_LOCK=off).
    Custom-tier runs still honour the operator's per-run picks. */
export function isVideoModelLocked(env: Record<string, string | undefined> = process.env): boolean {
  return (env.VIDEO_MODEL_LOCK ?? "on").toLowerCase() !== "off";
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

/** Portfolio-wide monthly ceiling on AI video generation (operator-set).
    NOTE: only enforced while spend caps are enabled — see src/lib/spend-caps.ts
    (suspended by default until the operator re-authorizes them). */
export const VIDEO_MONTHLY_CAP_USD = 100;

/** Ledger provider tag for fal-generated video. */
export const VIDEO_PROVIDER = "fal-video";

/** Ledger provider tag for Higgsfield-generated video. */
export const HF_VIDEO_PROVIDER = "higgsfield-video";

/** Every ledger tag that counts as AI video spend (cap + dashboard queries). */
export const VIDEO_LEDGER_PROVIDERS = [VIDEO_PROVIDER, HF_VIDEO_PROVIDER];

/** The ledger tag for a clip made by this model. */
export function videoLedgerProvider(model: Pick<VideoModel, "provider">): string {
  return modelProvider(model) === "higgsfield" ? HF_VIDEO_PROVIDER : VIDEO_PROVIDER;
}

export function estimateClipCost(model: VideoModel, durationSec: number): number {
  return Math.round(model.usdPerSec * clampDuration(model, durationSec) * 100) / 100;
}

// ── Long clips ────────────────────────────────────────────────────────

/** Base model for auto-stitch segments (cheap b-roll filler by default). */
export const STITCH_BASE_MODEL_ID = "seedance-2-fast";

/** Number of base segments needed to reach a target length via stitching. */
export function stitchSegments(model: VideoModel, targetSec: number): number {
  return Math.max(1, Math.ceil(targetSec / model.maxDurationSec));
}

/** Stitch cost — billed per second of generated footage (sum of segments). */
export function estimateStitchCost(model: VideoModel, targetSec: number): number {
  return Math.round(model.usdPerSec * Math.max(1, targetSec) * 100) / 100;
}

/** Veo-extend cost — premium per-second across the chained segments. */
export function estimateExtendCost(targetSec: number): number {
  const model = getVideoModel("veo-3-1-extend")!;
  return Math.round(model.usdPerSec * clampDuration(model, targetSec) * 100) / 100;
}
