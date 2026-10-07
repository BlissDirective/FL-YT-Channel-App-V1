import "server-only";
import { createHash } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import {
  DEFAULT_REF_IMAGE_MODEL_ID,
  checkReferenceImageJob,
  estimateRefImageCost,
  getRefImageModel,
  submitReferenceImageJob,
  RefImageJobFailed,
  type RefImageJob,
  type RefImageAspect,
  type RefImageResolution,
} from "@/lib/adapters/reference-image";
import { isFalLive } from "@/lib/adapters/fal";

type Db = ReturnType<typeof createAdminClient>;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const imageType = (b: Buffer) =>
  b[0] === 0xff && b[1] === 0xd8 ? { ct: "image/jpeg", ext: "jpg" } : b[0] === 0x52 && b[1] === 0x49 ? { ct: "image/webp", ext: "webp" } : { ct: "image/png", ext: "png" };

/** Max reference images per call: Nano Banana Pro takes 14, but identity
    holds best at six or fewer. */
export const CHARACTER_IMAGE_MAX_REFS = 6;

export type CharacterImageOpts = {
  projectId: string;
  name: string;
  prompt: string;
  /** Storage paths (media bucket) of locked looks the image must match. */
  references?: string[];
  aspect?: RefImageAspect;
  resolution?: RefImageResolution;
  /** reference-image model id (default Nano Banana Pro). */
  model?: string;
};

/** Validate before any spend. Pure. */
export function characterImageErrors(o: CharacterImageOpts): string[] {
  const errs: string[] = [];
  if (!o.projectId) errs.push("projectId required");
  if (!o.name.trim()) errs.push("name required");
  if (!o.prompt.trim()) errs.push("prompt required");
  if (!getRefImageModel(o.model ?? DEFAULT_REF_IMAGE_MODEL_ID)) errs.push(`unknown model ${o.model}`);
  const refs = o.references ?? [];
  if (refs.length > CHARACTER_IMAGE_MAX_REFS) errs.push(`at most ${CHARACTER_IMAGE_MAX_REFS} references`);
  for (const r of refs) {
    if (/^[a-z]+:\/\//i.test(r) || r.startsWith("/") || r.includes("..")) errs.push(`reference must be a media storage path: ${r}`);
  }
  return errs;
}

/** Storage path for a character image: deterministic in every input, so a
    retry after a client timeout returns the image already paid for. */
export function characterImagePath(o: CharacterImageOpts): string {
  const slug = o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "character";
  const key = JSON.stringify([o.model ?? DEFAULT_REF_IMAGE_MODEL_ID, o.prompt, o.references ?? [], o.aspect ?? "2:3", o.resolution ?? "2K"]);
  return `refs/${o.projectId}/char-${slug}-${sha(key).slice(0, 10)}`;
}

/**
 * One photoreal character image on a reference-capable model (Nano Banana Pro
 * by default). Passing earlier images as `references` holds the same person
 * across views — the way to build a consistent multi-view character sheet.
 */
export async function makeCharacterImage(
  db: Db,
  o: CharacterImageOpts,
  waitMs = CHARACTER_IMAGE_WAIT_MS,
): Promise<{ ok: true; path: string; url: string | null; costUsd: number; reused?: boolean } | { ok: false; error: string }> {
  const errs = characterImageErrors(o);
  if (errs.length) return { ok: false, error: errs.join("; ") };
  if (!isFalLive()) return { ok: false, error: "FAL_KEY not set" };
  const model = getRefImageModel(o.model ?? DEFAULT_REF_IMAGE_MODEL_ID)!;
  const base = characterImagePath(o);
  for (const ext of ["png", "jpg", "webp"]) {
    const url = await getSignedMediaUrl(`${base}.${ext}`, 3600);
    if (url) return { ok: true, path: `${base}.${ext}`, url, costUsd: 0, reused: true };
  }
  const leaseKey = `char_lease:${base}`;
  const { data: lease } = await db.from("app_settings").select("value").eq("key", leaseKey).maybeSingle();
  const held = (lease?.value ?? null) as CharacterImageLease | null;
  if (held?.job) return collect(db, o, base, leaseKey, held.job, held.at, waitMs);
  if (held?.at && Date.now() - held.at < 5 * 60_000) {
    return { ok: false, error: BUSY };
  }
  const refUrls: string[] = [];
  for (const r of o.references ?? []) {
    const u = await getSignedMediaUrl(r, 3600);
    if (!u) return { ok: false, error: `reference not found in storage: ${r}` };
    refUrls.push(u);
  }
  const at = Date.now();
  await db.from("app_settings").upsert({ key: leaseKey, value: { at } });
  let job: RefImageJob;
  try {
    job = await submitReferenceImageJob({
      model,
      prompt: o.prompt,
      referenceUrls: refUrls,
      aspectRatio: o.aspect ?? "2:3",
      resolution: o.resolution ?? "2K",
    });
  } catch (e) {
    await db.from("app_settings").delete().eq("key", leaseKey);
    return { ok: false, error: errText(e) };
  }
  // Persist the fal job before waiting on it: if this request times out, the
  // next call with the same inputs collects the image instead of paying again.
  await db.from("app_settings").upsert({ key: leaseKey, value: { at, job } satisfies CharacterImageLease });
  return collect(db, o, base, leaseKey, job, at, waitMs);
}

type CharacterImageLease = { at: number; job?: RefImageJob };
type CharacterImageResult = Awaited<ReturnType<typeof makeCharacterImage>>;

const BUSY = "busy — this image is still generating; call again in a minute (same inputs return it for free)";
/** Long enough for a typical image, short enough to answer inside an MCP
    client's 60s tool timeout. */
export const CHARACTER_IMAGE_WAIT_MS = 40_000;
/** A queued job still pending after this long is treated as lost. */
const STALE_JOB_MS = 2 * 60 * 60_000;
const errText = (e: unknown) => (e instanceof Error ? e.message.slice(0, 300) : String(e));

/** Wait briefly on a queued fal job; store and bill the image once it lands. */
async function collect(
  db: Db,
  o: CharacterImageOpts,
  base: string,
  leaseKey: string,
  job: RefImageJob,
  since: number,
  waitMs: number,
): Promise<CharacterImageResult> {
  let image: Buffer;
  try {
    const r = await checkReferenceImageJob(job, waitMs);
    if (r.state === "pending") {
      if (Date.now() - since > STALE_JOB_MS) {
        await db.from("app_settings").delete().eq("key", leaseKey);
        return { ok: false, error: "fal never finished this image; call again to start a new one" };
      }
      const mins = Math.max(1, Math.round((Date.now() - since) / 60_000));
      return { ok: false, error: `${BUSY} (queued on fal ${mins} min ago)` };
    }
    image = r.image;
  } catch (e) {
    // A failed job is cleared so the next call starts fresh; a network blip
    // keeps the job so the next call collects it, unless fal has been erroring
    // on a job this old (a 5xx result that never clears).
    if (e instanceof RefImageJobFailed || Date.now() - since > 15 * 60_000) {
      await db.from("app_settings").delete().eq("key", leaseKey);
    }
    return { ok: false, error: errText(e) };
  }
  const t = imageType(image);
  const path = `${base}.${t.ext}`;
  try {
    await uploadMedia(path, image, t.ct);
  } catch (e) {
    return { ok: false, error: errText(e) };
  }
  // Only the call that clears the lease bills, so two calls collecting the
  // same job at once ledger it once.
  const { data: cleared } = await db.from("app_settings").delete().eq("key", leaseKey).select("key");
  const model = getRefImageModel(o.model ?? DEFAULT_REF_IMAGE_MODEL_ID)!;
  const usd = estimateRefImageCost(model, 1, o.resolution ?? "2K");
  if (cleared?.length) {
    await db.from("cost_ledger").insert({
      project_id: o.projectId,
      video_id: null,
      provider: "fal",
      description: `${model.label} character image — ${o.name}`,
      usd,
    });
  }
  return { ok: true, path, url: await getSignedMediaUrl(path, 3600), costUsd: cleared?.length ? usd : 0 };
}
