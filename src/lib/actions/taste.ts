"use server";

import { revalidatePath } from "next/cache";
import { applyPlaybook, getStylePlaybook, type TasteProfile } from "@studio/core";
import { createClient } from "@/lib/supabase/server";

/**
 * Save a project's taste profile + chosen style playbook (Batch 4). When a
 * playbook is chosen its dials/rules are merged onto the profile so the stored
 * profile is the effective one every downstream stage reads.
 */
export async function saveTasteProfile(
  projectId: string,
  profile: TasteProfile,
  playbookId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const playbook = playbookId ? getStylePlaybook(playbookId) : undefined;
    const effective = playbook ? applyPlaybook(profile, playbook) : profile;
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .update({ taste_profile: effective, style_playbook: playbookId })
      .eq("id", projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/settings`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save" };
  }
}
