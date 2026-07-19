"use server";

import { revalidatePath } from "next/cache";
import {
  advanceCleanHouseRun,
  approveCleanHouseRun,
  cancelCleanHouseRun,
  pauseCleanHouseRun,
  triageCleanHouse,
  type TriageResult,
} from "@/lib/pipeline/clean-house-runner";
import type { CleanHouseBudgetStrategy } from "@studio/core";

/**
 * Clean House server actions (admin-gated inside the runner). The UI triages,
 * the operator approves a plan + ceiling, and the run advances tick-by-tick.
 */

export async function startCleanHouseTriage(
  projectId: string,
  mode: "all" | "selected",
  videoIds: string[] = [],
): Promise<{ ok: boolean; error?: string; result?: TriageResult }> {
  const res = await triageCleanHouse(projectId, { mode, videoIds });
  revalidatePath(`/projects/${projectId}/library`);
  return res;
}

export async function approveCleanHouse(
  projectId: string,
  runId: string,
  budgetCeilingUsd: number,
  overrides: { videoId: string; verdict: "advance" | "flag" | "skip" }[] = [],
  strategy: CleanHouseBudgetStrategy = "salvageability",
): Promise<{ ok: boolean; error?: string }> {
  const res = await approveCleanHouseRun(runId, budgetCeilingUsd, overrides, strategy);
  revalidatePath(`/projects/${projectId}/library`);
  return res;
}

export async function tickCleanHouse(projectId: string, runId: string): Promise<{ ok: boolean; done?: boolean }> {
  const res = await advanceCleanHouseRun(runId);
  revalidatePath(`/projects/${projectId}/library`);
  return res;
}

export async function pauseCleanHouse(projectId: string, runId: string) {
  const res = await pauseCleanHouseRun(runId);
  revalidatePath(`/projects/${projectId}/library`);
  return res;
}

export async function cancelCleanHouse(projectId: string, runId: string) {
  const res = await cancelCleanHouseRun(runId);
  revalidatePath(`/projects/${projectId}/library`);
  return res;
}
