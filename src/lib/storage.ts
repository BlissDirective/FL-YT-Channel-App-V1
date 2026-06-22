import "server-only";
import { isR2Path, r2SignedGetUrl, stripR2 } from "@studio/storage";
import { createAdminClient } from "@/lib/supabase/admin";

/** Media storage helpers for the private `media` bucket. */

const BUCKET = "media";

export async function uploadMedia(
  path: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`);
}

export async function getSignedMediaUrl(
  path: string,
  expiresInSec = 3600,
  /** When set, the link forces a download with this filename (Save to Files on
      mobile) rather than playing inline. Omit for inline preview URLs. */
  downloadAs?: string,
): Promise<string | null> {
  if (!path || path.startsWith("mock/")) return null;
  // R2-backed renders carry an `r2:` prefix — presign against R2 instead of
  // Supabase. Plain paths stay on Supabase Storage (intermediate assets and
  // any renders made before R2 was configured).
  if (isR2Path(path)) {
    try {
      return await r2SignedGetUrl(stripR2(path), expiresInSec, downloadAs);
    } catch {
      return null;
    }
  }
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec, downloadAs ? { download: downloadAs } : undefined);
  return data?.signedUrl ?? null;
}
