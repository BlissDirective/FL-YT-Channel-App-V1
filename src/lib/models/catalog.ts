/**
 * User-facing generation-model catalog + cost estimator (ClickMax transition
 * §4.3, §4.6). ONE source for the composer's model picker, the USD labels on
 * every Send/Continue button, and (v2) the credits rate table — assembled from
 * the live adapter registries so a model added there appears here without a
 * second edit.
 *
 * Plain-language `pros` are the ClickMax pattern: the picker sells trade-offs
 * ("realism-per-dollar", "lowest cost in the catalog"), not spec sheets.
 */
import {
  VIDEO_MODELS,
  estimateClipCost,
  getVideoModel,
  type VideoModel,
} from "@/lib/adapters/video-models";
import {
  AVATAR_MODELS,
  estimateAvatarCost,
  getAvatarModel,
  type AvatarModel,
} from "@/lib/adapters/avatar";

export type CatalogKind = "video" | "image" | "voice" | "avatar";

export type CatalogEntry = {
  id: string;
  kind: CatalogKind;
  label: string;
  description: string;
  pros: string[];
  badge: "Fast" | "Cheap" | "Best" | "Popular" | null;
  /** USD per unit — unit is seconds (video), images (image), 1k chars (voice). */
  unitUsd: number;
  unit: "sec" | "image" | "1k-chars";
  durations?: number[];
  minDurationSec?: number;
  maxDurationSec?: number;
};

const VIDEO_BADGES: Record<string, CatalogEntry["badge"]> = {
  "seedance-2-fast": "Cheap",
  "seedance-2": "Popular",
  "kling-2-5-turbo": "Popular",
  "veo-3-1": "Best",
};

const VIDEO_PROS: Record<string, string[]> = {
  "seedance-2-fast": [
    "Lowest cost in the catalog",
    "Fast turnaround for b-roll volume",
    "The default for most beats",
  ],
  "seedance-2": [
    "Top all-round quality for the price",
    "Optional native audio",
    "Great hero-beat upgrade",
  ],
  "kling-2-5-turbo": [
    "Extremely realistic body and facial movement",
    "Excellent realism-per-dollar",
    "Strong image-to-video from your keyframes",
  ],
  "ltx-2": ["Cheap motion for abstract/background scenes", "Fast queue times"],
  "wan-2-2": ["Strong prompt adherence", "Good stylized/animated looks"],
  "veo-3-1": [
    "Best-in-class cinematic camera movement",
    "Leading physics and lighting realism",
    "Premium hero shots and openers",
  ],
  "veo-3-1-extend": [
    "Chains 8s+7s segments to ~30s continuous shots",
    "Same premium Veo quality for long beats",
  ],
};

function videoEntry(m: VideoModel): CatalogEntry {
  return {
    id: m.id,
    kind: "video",
    label: m.label,
    description: m.bestFor,
    pros: VIDEO_PROS[m.id] ?? [m.bestFor],
    badge: VIDEO_BADGES[m.id] ?? null,
    unitUsd: m.usdPerSec,
    unit: "sec",
    durations: m.durations,
    minDurationSec: m.minDurationSec,
    maxDurationSec: m.maxDurationSec,
  };
}

/** FLUX still tiers (fal adapter constants) + ElevenLabs VO. */
const IMAGE_ENTRIES: CatalogEntry[] = [
  {
    id: "flux-schnell",
    kind: "image",
    label: "FLUX Schnell",
    description: "Fast, cheap stills — b-roll frames and drafts.",
    pros: ["Lowest image cost", "Fastest generations", "Fine for background beats"],
    badge: "Cheap",
    unitUsd: 0.003,
    unit: "image",
  },
  {
    id: "flux-dev",
    kind: "image",
    label: "FLUX Dev",
    description: "Premium stills — thumbnails and hero frames.",
    pros: ["Sharper detail and text handling", "The thumbnail default"],
    badge: "Best",
    unitUsd: 0.025,
    unit: "image",
  },
];

const VOICE_ENTRIES: CatalogEntry[] = [
  {
    id: "elevenlabs",
    kind: "voice",
    label: "ElevenLabs",
    description: "Realistic narration voices — the channel voice default.",
    pros: ["Most natural narration", "Large searchable voice library"],
    badge: "Best",
    unitUsd: Number(process.env.ELEVENLABS_USD_PER_1K_CHARS) > 0
      ? Number(process.env.ELEVENLABS_USD_PER_1K_CHARS)
      : 0.15,
    unit: "1k-chars",
  },
  {
    id: "kokoro",
    kind: "voice",
    label: "Kokoro",
    description: "Low-cost volume voice for drafts and shorts.",
    pros: ["Lowest cost in the catalog", "Good for high-volume drafts"],
    badge: "Cheap",
    unitUsd: 0.02,
    unit: "1k-chars",
  },
];

const AVATAR_BADGES: Record<string, CatalogEntry["badge"]> = {
  "kling-avatar-v2": "Popular",
  "veed-fabric-480": "Cheap",
  "omnihuman-1-5": "Best",
};

const AVATAR_PROS: Record<string, string[]> = {
  "kling-avatar-v2": [
    "Best cost per production minute",
    "Realistic AND stylized/cartoon characters",
    "The default presenter engine",
  ],
  "veed-fabric-480": ["Cheapest way to prototype the look", "Fast turnaround"],
  "veed-fabric-720": ["Fabric's production tier"],
  "omnihuman-1-5": ["Film-grade full-body motion", "Camera movement — hero shots"],
  infinitalk: ["Very stable lip-sync on long takes", "Handles unbroken monologues"],
};

function avatarEntry(m: AvatarModel): CatalogEntry {
  return {
    id: m.id,
    kind: "avatar",
    label: m.label,
    description: m.bestFor,
    pros: AVATAR_PROS[m.id] ?? [m.bestFor],
    badge: AVATAR_BADGES[m.id] ?? null,
    unitUsd: m.usdPerSec,
    unit: "sec",
    maxDurationSec: m.maxClipSec,
  };
}

export function modelCatalog(kind?: CatalogKind): CatalogEntry[] {
  const all = [
    ...VIDEO_MODELS.map(videoEntry),
    ...AVATAR_MODELS.map(avatarEntry),
    ...IMAGE_ENTRIES,
    ...VOICE_ENTRIES,
  ];
  return kind ? all.filter((e) => e.kind === kind) : all;
}

export function catalogEntry(id: string): CatalogEntry | undefined {
  return modelCatalog().find((e) => e.id === id);
}

/* ------------------------------------------------------------------ */
/* Cost estimation — the number printed on the button (§4.6).          */
/* ------------------------------------------------------------------ */

export type EstimatableAction =
  | { action: "clip"; modelId: string; durationSec: number }
  | { action: "avatar"; modelId: string; durationSec: number }
  | { action: "image"; tier?: "schnell" | "dev"; count?: number }
  | { action: "vo"; chars: number; voice?: "elevenlabs" | "kokoro" }
  | { action: "script"; targetLengthSec: number }
  | { action: "qc-review" };

/** Rough Anthropic call costs, sized from ledger history: a script run is a
    few large Sonnet calls; a QC review is one mid-size judge call. Estimates
    only — actuals always come from the ledger (§4.6 drift is logged). */
const SCRIPT_USD_PER_MIN = 0.05;
const QC_REVIEW_USD = 0.03;

export function estimateCost(a: EstimatableAction): number {
  switch (a.action) {
    case "clip": {
      const m = getVideoModel(a.modelId);
      return m ? estimateClipCost(m, a.durationSec) : 0;
    }
    case "avatar": {
      const m = getAvatarModel(a.modelId);
      return m ? estimateAvatarCost(m, a.durationSec) : 0;
    }
    case "image": {
      const per = a.tier === "dev" ? 0.025 : 0.003;
      return round2(per * (a.count ?? 1));
    }
    case "vo": {
      const entry = VOICE_ENTRIES.find((v) => v.id === (a.voice ?? "elevenlabs"))!;
      return round2((a.chars / 1000) * entry.unitUsd);
    }
    case "script":
      return round2((a.targetLengthSec / 60) * SCRIPT_USD_PER_MIN);
    case "qc-review":
      return QC_REVIEW_USD;
  }
}

/** Estimated cost of the NEXT stage from a status — the Continue label. */
export function estimateStageCost(opts: {
  status: string;
  targetLengthSec: number;
  beatCount?: number;
}): number {
  const beats = opts.beatCount ?? Math.max(3, Math.round(opts.targetLengthSec / 20));
  switch (opts.status) {
    case "IDEA":
    case "IDEA_APPROVED":
    case "SCRIPTING":
      return round2(estimateCost({ action: "script", targetLengthSec: opts.targetLengthSec }) + QC_REVIEW_USD);
    case "SCRIPT_READY":
    case "GENERATING_ASSETS": {
      // VO for the full runtime (~14 chars/sec spoken) + a still per beat + QC.
      const vo = estimateCost({ action: "vo", chars: opts.targetLengthSec * 14 });
      const stills = estimateCost({ action: "image", tier: "schnell", count: beats });
      return round2(vo + stills + QC_REVIEW_USD);
    }
    case "ASSETS_READY":
    case "ASSEMBLING":
      return QC_REVIEW_USD; // render farm compute is not provider-billed
    default:
      return 0;
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
