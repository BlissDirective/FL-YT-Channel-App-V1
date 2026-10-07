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

export type RefImageAspect = "16:9" | "1:1" | "9:16" | "3:2" | "2:3" | "4:3" | "3:4";
export type RefImageResolution = "1K" | "2K" | "4K";

export function estimateRefImageCost(model: RefImageModel, count = 1, resolution?: RefImageResolution): number {
  const rate = model.id === "nano-banana-pro" && resolution === "4K" ? model.usdPerImage * 2 : model.usdPerImage;
  return Math.round(rate * Math.max(1, count) * 1000) / 1000;
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
  aspectRatio?: RefImageAspect;
  /** Nano Banana Pro output size (fal default 1K); 4K bills at twice the rate. */
  resolution?: RefImageResolution;
}): Promise<RefImageResult> {
  const count = Math.min(Math.max(opts.count ?? 1, 1), 8);
  if (!isFalLive()) {
    return { provider: "mock", images: [], costUsd: 0, modelId: opts.model.id };
  }

  const { endpoint, input } = refImageRequest(opts, count);
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
  const images = await downloadImages((await res.json()) as FalImagesOutput);
  return {
    provider: "fal-ref-image",
    images,
    costUsd: estimateRefImageCost(opts.model, images.length, opts.resolution),
    modelId: opts.model.id,
  };
}

type RefImageRequestOpts = {
  model: RefImageModel;
  prompt: string;
  referenceUrls?: string[];
  aspectRatio?: RefImageAspect;
  resolution?: RefImageResolution;
};

function refImageRequest(opts: RefImageRequestOpts, count: number): { endpoint: string; input: Record<string, unknown> } {
  const refs = (opts.referenceUrls ?? []).slice(0, opts.model.maxReferences);
  const endpoint = refs.length > 0 ? opts.model.refEndpoint : opts.model.endpoint;
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    num_images: count,
    aspect_ratio: opts.aspectRatio ?? "16:9",
    enable_safety_checker: true,
  };
  if (opts.resolution && opts.model.id === "nano-banana-pro") input.resolution = opts.resolution;
  if (refs.length > 0) input.image_urls = refs;
  return { endpoint, input };
}

type FalImagesOutput = { images?: { url?: string }[] };

async function downloadImages(data: FalImagesOutput): Promise<Buffer[]> {
  const urls = (data.images ?? []).map((i) => i.url).filter((u): u is string => Boolean(u));
  if (urls.length === 0) throw new Error("fal returned no images");
  return Promise.all(
    urls.map(async (url) => {
      const dl = await fetch(url);
      if (!dl.ok) throw new Error(`image download failed (${dl.status})`);
      return Buffer.from(await dl.arrayBuffer());
    }),
  );
}

/** A fal queue job for one image. Holds no credential (fal auth is a header),
    so it is safe to persist and resume from a later request. */
export type RefImageJob = { statusUrl: string; responseUrl: string };

/** fal finished the job without an image (failed, rejected, or expired).
    Anything else thrown while checking is transient: check again later. */
export class RefImageJobFailed extends Error {}

const falHeaders = () => ({ Authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" });

/**
 * Queue one image on fal and return the job without waiting for it. Unlike
 * generateReferenceImage, a slow model can't lose the image: the job keeps
 * running on fal and checkReferenceImageJob collects it whenever it's done.
 */
export async function submitReferenceImageJob(opts: RefImageRequestOpts): Promise<RefImageJob> {
  const { endpoint, input } = refImageRequest(opts, 1);
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers: falHeaders(),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`fal ${endpoint} submit ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const q = (await res.json()) as { status_url?: string; response_url?: string };
  if (!q.status_url || !q.response_url) throw new Error("fal queue returned no status/response URL");
  return { statusUrl: q.status_url, responseUrl: q.response_url };
}

/**
 * Poll a queued image job until it finishes or `waitMs` runs out. "pending"
 * means it's still running on fal — check again later with the same job.
 * Throws when fal reports the job failed (e.g. a safety-checker rejection).
 */
export async function checkReferenceImageJob(
  job: RefImageJob,
  waitMs: number,
): Promise<{ state: "pending" } | { state: "done"; image: Buffer }> {
  const deadline = Date.now() + waitMs;
  for (;;) {
    const st = await fetch(job.statusUrl, { headers: falHeaders(), cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (st?.status === 404) throw new RefImageJobFailed("fal no longer has this job");
    const status = st?.ok ? ((await st.json()) as { status?: string }).status : undefined;
    if (status === "COMPLETED") break;
    if (status === "FAILED" || status === "ERROR") throw new RefImageJobFailed("fal reported the image job failed");
    if (Date.now() + 3000 > deadline) return { state: "pending" };
    await new Promise((r) => setTimeout(r, 3000));
  }
  const resp = await fetch(job.responseUrl, { headers: falHeaders(), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (resp.status >= 400 && resp.status < 500) {
    throw new RefImageJobFailed(`fal image job failed ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  if (!resp.ok) throw new Error(`fal result ${resp.status}`);
  const data = (await resp.json()) as FalImagesOutput;
  if (!data.images?.some((i) => i.url)) throw new RefImageJobFailed("fal returned no images");
  const [image] = await downloadImages(data);
  return { state: "done", image };
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
