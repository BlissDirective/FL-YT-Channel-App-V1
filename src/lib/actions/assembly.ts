"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertOperator } from "@/lib/auth-guard";
import {
  initialPlanFromBeats,
  segmentsFromShotPlan,
  segmentPlanCost,
  validateSegmentPlan,
  type SegmentPlan,
} from "@studio/core";
import { planShots } from "@/lib/adapters/shot-planner";
import type { ScriptBeat } from "@/lib/db/types";

/**
 * Assembly/Storyboard screen actions (Editor & Assembly R2). Persist the
 * granular segment plan and seed it automatically from the V2 router (AUTO).
 * Operator-gated (service-role writes bypass RLS, so the caller is verified).
 */

export type AssemblyResult = { ok: boolean; error?: string; plan?: SegmentPlan };

async function loadBeats(videoId: string): Promise<ScriptBeat[]> {
  const supabase = await createClient();
  const { data: script } = await supabase
    .from("scripts")
    .select("beats")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((script?.beats ?? []) as ScriptBeat[]) || [];
}

/** Save the operator-authored plan. Recomputes the cost server-side and
    rejects a structurally invalid plan (gaps/overlaps/bad sequences). */
export async function saveAssemblyPlanAction(videoId: string, plan: SegmentPlan): Promise<AssemblyResult> {
  await assertOperator();
  const check = validateSegmentPlan(plan);
  if (!check.ok) {
    return { ok: false, error: `Plan invalid: ${check.errors[0]?.msg ?? "unknown"}` };
  }
  const normalized: SegmentPlan = { ...plan, planCostUsd: segmentPlanCost(plan) };
  const supabase = await createClient();
  const { error } = await supabase.from("videos").update({ assembly_plan: normalized }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects`);
  return { ok: true, plan: normalized };
}

/** AUTO: build a plan from the script beats. Uses the V2 router when it can
    (budget-aware medium choices), else a plain one-segment-per-beat default. */
export async function autoAssemblyPlanAction(videoId: string, budgetUsd = 8): Promise<AssemblyResult> {
  await assertOperator();
  const beats = await loadBeats(videoId);
  if (beats.length === 0) return { ok: false, error: "This video has no script beats yet." };

  let plan: SegmentPlan;
  try {
    const shotPlan = await planShots({
      beats,
      ctx: { budgetRemainingUsd: budgetUsd, dataVizAllowed: true, stickAllowed: true },
      budgetUsd,
    });
    plan = segmentsFromShotPlan(shotPlan);
  } catch {
    plan = initialPlanFromBeats(beats.map((b) => ({ idx: b.idx, shotType: b.shotType })));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("videos").update({ assembly_plan: plan }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects`);
  return { ok: true, plan };
}

/** Clear the stored plan (revert to the beat-derived default on next open). */
export async function clearAssemblyPlanAction(videoId: string): Promise<AssemblyResult> {
  await assertOperator();
  const supabase = await createClient();
  const { error } = await supabase.from("videos").update({ assembly_plan: null }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/projects`);
  return { ok: true };
}
