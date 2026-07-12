"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOperator } from "@/lib/auth-guard";
import {
  pauseOperator,
  startOperator,
  stopOperator,
  tickOperator,
  getOperatorRun,
  skipCalendarSlot,
  regenerateCalendarFor,
} from "@/lib/pipeline/operator";
import { getProject } from "@/lib/db/queries";
import type { Project } from "@/lib/db/types";

type Result = { ok: boolean; error?: string };

/** Every operator action bypasses RLS (service role) and starts/stops
    autonomous spend — assert the caller is the operator before handing one a
    client. */
async function admin() {
  await assertOperator();
  return createAdminClient();
}

/** Start (or resume) the Auto Pilot Operator for a project. Anchors the 30-day
    budget cycle on the first start; resuming a paused run keeps the anchor. */
export async function startOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await startOperator(await admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Pause temporarily — the budget clock keeps elapsing; no new videos seed. */
export async function pauseOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await pauseOperator(await admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Stop the run entirely. The budget cap is not reset before the 30-day mark. */
export async function stopOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await stopOperator(await admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Veto a calendar slot — the operator skips it and produces the next one. */
export async function skipCalendarSlotAction(projectId: string, day: number): Promise<Result> {
  try {
    const r = await skipCalendarSlot(await admin(), projectId, day);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Re-plan the 30-day calendar from scratch. */
export async function regenerateCalendarAction(projectId: string): Promise<Result> {
  try {
    const r = await regenerateCalendarFor(await admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Flip the operator's autonomy level without a DB edit (Tier 8A). Read fresh
    every tick and only affects the FINAL-approval decision — safe to toggle
    anytime. Flipping to 'autopilot' auto-publishes gate-passing videos on the
    next tick; 'copilot' holds marginal ones for a manual tap. */
export async function setOperatorAutonomyAction(
  projectId: string,
  mode: "copilot" | "autopilot",
): Promise<Result> {
  try {
    const db = await admin();
    const run = await getOperatorRun(db, projectId);
    if (!run) return { ok: false, error: "Operator is not running — start it first." };
    const config = { ...(run.config ?? {}), autonomy: mode };
    const { error } = await db
      .from("operator_runs")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("id", run.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

