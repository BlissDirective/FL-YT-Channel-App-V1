"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { planHookVariants, variantAdName } from "@/lib/pipeline/variants";
import type { Script, ScriptBeat, Video } from "@/lib/db/types";

export type VariantsResult = { ok: boolean; error?: string; count?: number };

/**
 * Fan a QC-passed script out into hook A/B variants. Each variant is a child
 * `video` (parent_video_id set, like a derived Short) whose script differs from
 * the parent ONLY in beat 0 (the hook) — so the asset stage's changed-beat-only
 * cache reuses the parent's VO and visuals for beats 1..n, and the fan-out costs
 * ~one hook beat per variant rather than N full videos. Variants enter at
 * GENERATING_ASSETS (the parent already cleared IDEA + SCRIPT), then run the
 * ASSETS and FINAL gates on their own.
 *
 * Mirrors deriveShortsAction (src/lib/actions/shorts.ts); the pure planner is
 * unit-tested in tests/variants.test.ts.
 */
export async function deriveVariantsAction(
  projectId: string,
  parentVideoId: string,
  opts: { max?: number },
): Promise<VariantsResult> {
  try {
    const supabase = await createClient();

    const { data: parent } = await supabase
      .from("videos")
      .select("*")
      .eq("id", parentVideoId)
      .maybeSingle();
    if (!parent) return { ok: false, error: "Parent video not found." };
    if ((parent as Video).kind === "short") {
      return { ok: false, error: "Derive variants from the main creative, not a Short." };
    }
    if ((parent as Video).parent_video_id) {
      return { ok: false, error: "This is already a variant — derive variants from the original." };
    }

    const { data: script } = await supabase
      .from("scripts")
      .select("beats, metadata, runtime_sec, body")
      .eq("video_id", parentVideoId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const beats = ((script?.beats as ScriptBeat[] | undefined) ?? []).filter((b) => b.text?.trim());
    if (beats.length < 2) {
      return { ok: false, error: "This creative has no usable script to make variants from." };
    }
    const metadata = (script?.metadata as Script["metadata"] | undefined) ?? {};
    // The writer delivers alternate hook/title angles (metadata.titles, strongest
    // first) — the raw material for A/B hooks. planHookVariants dedupes them
    // against the original hook and caps the fan-out.
    const altHooks = (metadata.titles ?? []).filter((t) => t?.trim());
    const variants = planHookVariants({ beats, altHooks, max: opts.max });
    const alternates = variants.filter((v) => v.key !== "A");
    if (alternates.length === 0) {
      return { ok: false, error: "No distinct alternate hooks to test — add hook options to the script first." };
    }

    // Insert the child video rows, then a script row per child (needs the ids).
    const videoRows = alternates.map((v) => ({
      project_id: parent.project_id,
      idea_id: null,
      title: variantAdName(parent.title, v.key),
      topic: parent.topic,
      format: parent.format,
      kind: parent.kind,
      parent_video_id: parentVideoId,
      target_length_sec: parent.target_length_sec,
      status: "GENERATING_ASSETS",
    }));
    const { data: inserted, error: insErr } = await supabase
      .from("videos")
      .insert(videoRows)
      .select("id");
    if (insErr) return { ok: false, error: insErr.message };

    const childIds = (inserted ?? []) as { id: string }[];
    const scriptRows = alternates.map((v, i) => ({
      video_id: childIds[i].id,
      version: 1,
      body: v.beats.map((b) => b.text).join("\n\n"),
      beats: v.beats,
      runtime_sec: (script?.runtime_sec as number | null) ?? null,
      // Reuse the parent's metadata but lead with this variant's hook so the
      // cover/title reflects the angle being tested.
      metadata: { ...metadata, titles: [v.hook, ...(metadata.titles ?? [])] },
    }));
    const { error: scriptErr } = await supabase.from("scripts").insert(scriptRows);
    if (scriptErr) return { ok: false, error: scriptErr.message };

    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/videos/${parentVideoId}`);
    return { ok: true, count: alternates.length };
  } catch (err) {
    console.error("deriveVariantsAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
