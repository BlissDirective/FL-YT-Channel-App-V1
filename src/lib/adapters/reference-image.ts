import "server-only";

/**
 * Reference-capable image generation (Character Studio Phase 2).
 *
 * The whole Character Studio rests on one capability the existing FLUX
 * schnell/dev path does not have: feeding MULTIPLE locked reference images
 * into a single generation so Bo and Breeze both come out recognizably
 * themselves. That is why premium is the default here (plan §2) — this is the
 * one place where cheap models measurably fail the job.
 *
 * Models (fal, verified Jul 2026):
 *  - nano-banana-pro  $0.15/img — up to 14 references, holds ~5 characters in
 *    one scene, best-in-class text rendering. DEFAULT for character work.
 *  - flux-2-pro       ~$0.03/MP — multi-reference up to 10 images. Volume tier
 *    for single-character or background scenes.
 *
 * Endpoint slugs are PINNED against fal's live catalog, same policy as
 * VIDEO_MODELS / AVATAR_MODELS / SONG_MODELS. Mock-first: no FAL_KEY → a
 * deterministic mock so the Studio is fully usable (and testable) with zero
 * credentials.
 */
import { isFalLive } from "./fal";

export type RefImageModel = {
  id: string;
  label: string;
  endpoint: string;
  /** Endpoint used when reference images are supplied (edit/compose route). */
  refEndpoint: string;
  usdPerImage: number;
  maxReferences: number;
  bestFor: string;
};

export const REF_IMAGE_MODELS: RefImageModel[] = [
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    endpoint: "fal-ai/nano-banana-pro",
    refEndpoint: "fal-ai/nano-banana-pro/edit",
    usdPerImage: 0.15,
    // Supports 14; quality holds best at ≤6, which is well above our
    // 4-character scene cap.
    maxReferences: 14,
    bestFor: "Character work — multi-reference consistency across several characters in one frame",
  },
  {
    id: "flux-2-pro",
    label: "FLUX.2 Pro",
    endpoint: "fal-ai/flux-2-pro",
    refEndpoint: "fal-ai/flux-2-pro/edit",
    usdPerImage: 0.03,
    maxReferences: 10,
    bestFor: "Volume tier — single-character scenes and backgrounds at a tenth the cost",
  },
];

/** Premium by default for character work (operator directive). */
export const DEFAULT_REF_IMAGE_MODEL_ID = "nano-banana-pro";

export function getRefImageModel(id: string): RefImageModel | undefined {
  return REF_IMAGE_MODELS.find((m) => m.id === id);
}

export function estimateRefImageCost(model: RefImageModel, count = 1): number {
  return Math.round(model.usdPerImage * Math.max(1, count) * 1000) / 1000;
}

export type RefImageResult =
  | {
      provider: "fal-ref-image";
      images: Buffer[];
      costUsd: number;
      modelId: string;
    }
  | { provider: "mock"; images: []; costUsd: 0; modelId: string };

/**
 * Generate one or more images, optionally conditioned on reference images.
 *
 * `referenceUrls` are signed, publicly-fetchable URLs of locked character
 * looks. Supplying them switches to the model's edit/compose endpoint, which
 * is what carries identity across frames.
 */
export async function generateReferenceImage(opts: {
  model: RefImageModel;
  prompt: string;
  referenceUrls?: string[];
  /** How many candidates to return (the Studio's grid). */
  count?: number;
  aspectRatio?: "16:9" | "1:1" | "9:16";
}): Promise<RefImageResult> {
  const count = Math.min(Math.max(opts.count ?? 1, 1), 8);
  if (!isFalLive()) {
    return { provider: "mock", images: [], costUsd: 0, modelId: opts.model.id };
  }

  const refs = (opts.referenceUrls ?? []).slice(0, opts.model.maxReferences);
  const endpoint = refs.length > 0 ? opts.model.refEndpoint : opts.model.endpoint;
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    num_images: count,
    aspect_ratio: opts.aspectRatio ?? "16:9",
    enable_safety_checker: true,
  };
  if (refs.length > 0) input.image_urls = refs;

  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    throw new Error(`fal ${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { images?: { url?: string }[] };
  const urls = (data.images ?? []).map((i) => i.url).filter((u): u is string => Boolean(u));
  if (urls.length === 0) throw new Error("fal returned no images");

  const images = await Promise.all(
    urls.map(async (url) => {
      const dl = await fetch(url);
      if (!dl.ok) throw new Error(`image download failed (${dl.status})`);
      return Buffer.from(await dl.arrayBuffer());
    }),
  );
  return {
    provider: "fal-ref-image",
    images,
    costUsd: estimateRefImageCost(opts.model, images.length),
    modelId: opts.model.id,
  };
}

/* ------------------------------------------------------------------ */
/* Prompt builders for the Studio's two standard artifacts             */
/* ------------------------------------------------------------------ */

/** The turnaround sheet auto-generated on lock — the single highest-leverage
    consistency artifact (plan §4.2 step 3). */
export function characterSheetPrompt(opts: {
  styleString: string;
  description: string;
  identityAnchor?: string | null;
  background?: string;
}): string {
  const anchor = opts.identityAnchor?.trim()
    ? ` Always keep: ${opts.identityAnchor.trim()}.`
    : "";
  return (
    `${opts.styleString.trim()} ${opts.description.trim()}${anchor} ` +
    `Character reference sheet: the same character shown three times on a plain ` +
    `${opts.background ?? "cream"} background — front view, three-quarter view, and side view, ` +
    `full body, neutral friendly expression, identical proportions across all three. ` +
    `No text, no letters, no numbers, no logos, no watermarks, no extra characters.`
  );
}

/** The chest-up framing avatar models want (decision Q2). */
export function portraitLookPrompt(opts: {
  styleString: string;
  description: string;
  identityAnchor?: string | null;
}): string {
  const anchor = opts.identityAnchor?.trim()
    ? ` Always keep: ${opts.identityAnchor.trim()}.`
    : "";
  return (
    `${opts.styleString.trim()} ${opts.description.trim()}${anchor} ` +
    `Portrait framing: chest-up, facing camera directly, centered, neutral friendly ` +
    `expression, even lighting, simple uncluttered background. ` +
    `No text, no logos, no watermarks, no extra characters.`
  );
}
