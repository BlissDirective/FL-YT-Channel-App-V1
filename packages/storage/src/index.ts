/**
 * Object-storage adapter for finished video renders.
 *
 * When Cloudflare R2 is configured (S3-compatible, no per-file size cap, zero
 * egress) finished long- AND short-form renders are stored there so every video
 * is downloadable regardless of size. Without R2, callers fall back to Supabase
 * Storage. R2-backed asset paths are persisted with an `r2:` prefix so the read
 * side knows which backend to sign/download against — old Supabase paths (no
 * prefix) keep resolving unchanged, so no data migration is needed.
 *
 * Credentials (all four required to enable R2):
 *   R2_ACCOUNT_ID  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY  R2_BUCKET
 */
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Prefix marking a storage_path as living in R2 rather than Supabase Storage. */
export const R2_PREFIX = "r2:";
export const isR2Path = (p: string | null | undefined): boolean =>
  Boolean(p && p.startsWith(R2_PREFIX));
export const toR2Path = (key: string): string => `${R2_PREFIX}${key}`;
export const stripR2 = (p: string): string =>
  p.startsWith(R2_PREFIX) ? p.slice(R2_PREFIX.length) : p;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** True only when every R2 credential is present. */
export function r2Configured(): boolean {
  return Boolean(
    env("R2_ACCOUNT_ID") &&
      env("R2_ACCESS_KEY_ID") &&
      env("R2_SECRET_ACCESS_KEY") &&
      env("R2_BUCKET"),
  );
}

let cached: S3Client | null = null;
function client(): S3Client {
  if (cached) return cached;
  const accountId = env("R2_ACCOUNT_ID");
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)",
    );
  }
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2 needs path-style addressing — the default virtual-hosted style would
    // build `<bucket>.<account>.r2.cloudflarestorage.com`, which R2's wildcard
    // cert (`*.r2.cloudflarestorage.com`, one label) doesn't cover → TLS error.
    forcePathStyle: true,
  });
  return cached;
}

function bucket(): string {
  const b = env("R2_BUCKET");
  if (!b) throw new Error("R2 is not configured (R2_BUCKET)");
  return b;
}

/** Upload an object to R2. `key` is bucket-relative (pass it without `r2:`). */
export async function r2Put(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

/** Presigned GET URL for an R2 object key (pass it without `r2:`). */
export async function r2SignedGetUrl(key: string, expiresInSec = 3600): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: expiresInSec,
  });
}

/** Download an R2 object's bytes (pass the key without `r2:`). */
export async function r2Get(key: string): Promise<Buffer> {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = res.Body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (!body?.transformToByteArray) throw new Error(`R2 get ${key}: empty body`);
  return Buffer.from(await body.transformToByteArray());
}
