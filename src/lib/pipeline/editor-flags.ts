import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Editor & Assembly feature flags (app_settings key 'editor'). Every system
 * ships DARK (default off): the Assembly/Storyboard screen, the pro-editor
 * timeline upgrades, the keyframe editor, and the planning-agent tools. With
 * all off the pipeline behaves exactly as before this revision.
 *
 * See Fable5-Editor-and-Assembly-Revision-Spec.md §7.
 */

type Db = ReturnType<typeof createAdminClient>;

export type EditorFlags = {
  assembly: boolean; // R2 — Assembly/Storyboard screen
  proEditor: boolean; // R4 — pro timeline upgrades
  keyframes: boolean; // R5 — keyframe editor UI + speed ramps
  segmentAgent: boolean; // R3 — planning-agent tools + suggestion diff
};

export const EDITOR_DEFAULTS: EditorFlags = {
  assembly: false,
  proEditor: false,
  keyframes: false,
  segmentAgent: false,
};

let cached: { at: number; flags: EditorFlags } | null = null;

export function invalidateEditorCache(): void {
  cached = null;
}

export async function getEditorFlags(db?: Db): Promise<EditorFlags> {
  if (cached && Date.now() - cached.at < 60_000) return cached.flags;
  const supabase = db ?? createAdminClient();
  const flags = { ...EDITOR_DEFAULTS };
  try {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "editor").maybeSingle();
    const v = (data?.value ?? {}) as Partial<EditorFlags>;
    for (const k of Object.keys(flags) as (keyof EditorFlags)[]) {
      if (typeof v[k] === "boolean") flags[k] = v[k] as boolean;
    }
  } catch {
    /* missing row/table → all off */
  }
  cached = { at: Date.now(), flags };
  return flags;
}
