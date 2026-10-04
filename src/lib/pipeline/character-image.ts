import "server-only";
import { createHash } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import {
  DEFAULT_REF_IMAGE_MODEL_ID,
  estimateRefImageCost,
  generateReferenceImage,
  getRefImageModel,
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
  const leasedAt = Number((lease?.value as { at?: number } | null)?.at ?? 0);
  if (leasedAt && Date.now() - leasedAt < 5 * 60_000) {
    return { ok: false, error: "busy — this image is still generating; call again in a minute (same inputs return it for free)" };
  }
  const refUrls: string[] = [];
  for (const r of o.references ?? []) {
    const u = await getSignedMediaUrl(r, 3600);
    if (!u) return { ok: false, error: `reference not found in storage: ${r}` };
    refUrls.push(u);
  }
  await db.from("app_settings").upsert({ key: leaseKey, value: { at: Date.now() } });
  try {
    const out = await generateReferenceImage({
      model,
      prompt: o.prompt,
      referenceUrls: refUrls,
      count: 1,
      aspectRatio: o.aspect ?? "2:3",
      resolution: o.resolution ?? "2K",
    });
    if (out.provider === "mock" || !out.images[0]) return { ok: false, error: "image model returned no image" };
    const img = out.images[0];
    const t = imageType(img);
    const path = `${base}.${t.ext}`;
    await uploadMedia(path, img, t.ct);
    const usd = estimateRefImageCost(model, 1, o.resolution ?? "2K");
    await db.from("cost_ledger").insert({
      project_id: o.projectId,
      video_id: null,
      provider: "fal",
      description: `${model.label} character image — ${o.name}`,
      usd,
    });
    return { ok: true, path, url: await getSignedMediaUrl(path, 3600), costUsd: usd };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
  } finally {
    await db.from("app_settings").delete().eq("key", leaseKey);
  }
}
