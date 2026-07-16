"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin-guard";
import { invalidateEditorCache } from "@/lib/pipeline/editor-flags";

/**
 * Editor & Assembly feature flags (app_settings key 'editor'). Admin-only, like
 * the VCE flags. Merges the change onto the stored blob and busts the runtime
 * cache so a toggle takes effect within the minute.
 */
export async function setEditorFlagsAction(
  flags: Partial<Record<"assembly" | "proEditor" | "keyframes" | "segmentAgent", boolean>>,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "editor").maybeSingle();
  const existing = (data?.value ?? {}) as Record<string, boolean>;
  const merged = { ...existing } as Record<string, boolean>;
  for (const [k, v] of Object.entries(flags)) if (typeof v === "boolean") merged[k] = v;
  const { error } = await supabase.from("app_settings").upsert({ key: "editor", value: merged });
  invalidateEditorCache();
  revalidatePath("/settings");
  return error ? { ok: false, error: error.message } : { ok: true };
}
