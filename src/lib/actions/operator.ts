"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

function admin() {
  return createAdminClient();
}

/** Start (or resume) the Auto Pilot Operator for a project. Anchors the 30-day
    budget cycle on the first start; resuming a paused run keeps the anchor. */
export async function startOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await startOperator(admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Pause temporarily — the budget clock keeps elapsing; no new videos seed. */
export async function pauseOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await pauseOperator(admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Stop the run entirely. The budget cap is not reset before the 30-day mark. */
export async function stopOperatorAction(projectId: string): Promise<Result> {
  try {
    const r = await stopOperator(admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Veto a calendar slot — the operator skips it and produces the next one. */
export async function skipCalendarSlotAction(projectId: string, day: number): Promise<Result> {
  try {
    const r = await skipCalendarSlot(admin(), projectId, day);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Re-plan the 30-day calendar from scratch. */
export async function regenerateCalendarAction(projectId: string): Promise<Result> {
  try {
    const r = await regenerateCalendarFor(admin(), projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Run one operator tick now (operator-triggered) — seeds today's video if the
    slot is open and budget allows, instead of waiting for the cron. */
export async function runOperatorNowAction(
  projectId: string,
): Promise<Result & { seeded?: boolean; reason?: string }> {
  try {
    const db = admin();
    const run = await getOperatorRun(db, projectId);
    if (!run) return { ok: false, error: "Operator is not running." };
    const project = (await getProject(projectId)) as Project | null;
    if (!project) return { ok: false, error: "Project not found." };
    const out = await tickOperator(db, run, project);
    revalidatePath(`/projects/${projectId}`);
    return out.acted ? { ok: true, seeded: true } : { ok: true, seeded: false, reason: out.reason };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
