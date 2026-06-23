"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/lib/db/queries";
import {
  cancelBuildRun,
  channelPlaybook,
  estimateBuildCost,
  pauseBuildRun,
  resumeBuildRun,
  type BuildCostEstimate,
  type BuildRunConfig,
  type ChannelPlaybook,
} from "@/lib/pipeline/engine";

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

/** Live cost estimate + performance playbook for the Build & Post modal.
    No writes — called as the operator tweaks the config. */
export async function estimateBuildRunAction(
  projectId: string,
  config: BuildRunConfig,
): Promise<{
  ok: boolean;
  error?: string;
  estimate?: BuildCostEstimate;
  playbook?: ChannelPlaybook;
}> {
  try {
    const project = await getProject(projectId);
    if (!project) return { ok: false, error: "Project not found" };
    const db = await createClient();
    const [estimate, playbook] = await Promise.all([
      estimateBuildCost(project, config, db),
      channelPlaybook(db, projectId),
    ]);
    return { ok: true, estimate, playbook };
  } catch (err) {
    console.error("estimateBuildRun failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** The channel's performance playbook on its own (drives suggested defaults
    when the modal first opens). */
export async function getBuildDefaultsAction(
  projectId: string,
): Promise<{ ok: boolean; playbook?: ChannelPlaybook }> {
  try {
    const db = await createClient();
    return { ok: true, playbook: await channelPlaybook(db, projectId) };
  } catch (err) {
    console.error("getBuildDefaults failed:", err);
    return { ok: false };
  }
}

export async function pauseBuildRunAction(
  projectId: string,
  runId: string,
): Promise<{ ok: boolean }> {
  const r = await pauseBuildRun(runId);
  refresh(projectId);
  return r;
}

export async function resumeBuildRunAction(
  projectId: string,
  runId: string,
): Promise<{ ok: boolean }> {
  const r = await resumeBuildRun(runId);
  refresh(projectId);
  return r;
}

export async function cancelBuildRunAction(
  projectId: string,
  runId: string,
): Promise<{ ok: boolean; stopped?: number }> {
  const r = await cancelBuildRun(runId);
  refresh(projectId);
  return r;
}
