import "server-only";
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
): Promise<string | null> {
  if (!path || path.startsWith("mock/")) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}
