import "server-only";

/**
 * Workspace action registry (ClickMax transition §3.1, Phase 1).
 *
 * Every capability the workspace exposes — via composer buttons OR the chat
 * intent router — is a registered action here: one typed definition with a
 * cost estimator and an executor. Buttons are sugar over the same actions the
 * router invokes, so chat coverage is structural: a capability that isn't
 * registered doesn't exist in the new UX, and one that is registered is
 * automatically reachable from both surfaces.
 *
 * The router can never construct raw engine calls — it only names an action
 * and supplies params, which are validated against the action's param spec
 * before the executor runs (the registry is the security boundary as well as
 * the coverage boundary).
 */
import {
  advanceStage,
  decideGate,
  fullAutoGenerate,
  generateBeatVideo,
  regenerateAsset,
  regenerateBeatVo,
  regenerateScript,
  rerollBeatVisual,
} from "@/lib/pipeline/engine";
import { estimateCost, estimateStageCost } from "@/lib/models/catalog";
import type { AutoTier } from "@/lib/adapters/auto-tiers";
import type { Db } from "@/lib/pipeline/engine";
import { createClient } from "@/lib/supabase/server";

export type ParamSpec = {
  type: "string" | "number" | "boolean";
  required?: boolean;
  description: string;
};

export type ActionResult = { ok: boolean; error?: string; data?: unknown };

export type WorkspaceAction = {
  name: string;
  description: string;
  /** Params the router/buttons may pass; validated before execute. */
  params: Record<string, ParamSpec>;
  /** true → the confirm-with-USD-estimate rule applies before execution. */
  costBearing: boolean;
  /** Estimated USD for the confirm label; null when free/unknown-cheap. */
  estimate: (params: Record<string, unknown>) => number | null;
  execute: (params: Record<string, unknown>, db?: Db) => Promise<ActionResult>;
};

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

function validate(
  action: WorkspaceAction,
  params: Record<string, unknown>,
): string | null {
  for (const [key, spec] of Object.entries(action.params)) {
    const v = params[key];
    if (v == null) {
      if (spec.required) return `Missing required param "${key}"`;
      continue;
    }
    if (typeof v !== spec.type) return `Param "${key}" must be a ${spec.type}`;
  }
  return null;
}

const ACTIONS: WorkspaceAction[] = [
  {
    name: "continue",
    description:
      "Advance the video one stage: approve the open gate if it's holding at one, otherwise run the current working stage once.",
    params: {
      videoId: { type: "string", required: true, description: "Video to advance" },
      atGate: { type: "boolean", description: "Set when the video is holding at a gate" },
      status: { type: "string", description: "Current status, for the cost label" },
      targetLengthSec: { type: "number", description: "Video target length, for the cost label" },
    },
    costBearing: true,
    estimate: (p) =>
      estimateStageCost({
        status: str(p.status) ?? "",
        targetLengthSec: num(p.targetLengthSec) ?? 300,
      }),
    execute: async (p, db) => {
      const videoId = str(p.videoId)!;
      if (p.atGate) {
        return decideGate({ videoId, decision: "approved" }, db);
      }
      return advanceStage(videoId, db);
    },
  },
  {
    name: "regenerate_script",
    description: "Rewrite the whole script (optionally steered by notes) as a new version.",
    params: {
      videoId: { type: "string", required: true, description: "Video whose script to rewrite" },
    },
    costBearing: true,
    estimate: () => estimateCost({ action: "script", targetLengthSec: 300 }),
    execute: async (p) => regenerateScript({ videoId: str(p.videoId)! }),
  },
  {
    name: "regenerate_beat_visual",
    description:
      "Re-roll one beat's visual (still/clip), optionally steered by a note, without re-running the stage.",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
      beatIdx: { type: "number", required: true, description: "Beat index (0-based)" },
      note: { type: "string", description: "Steering note appended to the visual prompt" },
    },
    costBearing: true,
    estimate: () => estimateCost({ action: "image", tier: "dev" }),
    execute: async (p) =>
      rerollBeatVisual({
        videoId: str(p.videoId)!,
        beatIdx: num(p.beatIdx)!,
        note: str(p.note),
      }),
  },
  {
    name: "regenerate_beat_vo",
    description:
      "Re-synthesize one beat's voiceover as a fresh take (bypasses the VO cache).",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
      beatIdx: { type: "number", required: true, description: "Beat index (0-based)" },
    },
    costBearing: true,
    estimate: () => estimateCost({ action: "vo", chars: 400 }),
    execute: async (p) =>
      regenerateBeatVo({ videoId: str(p.videoId)!, beatIdx: num(p.beatIdx)! }),
  },
  {
    name: "regenerate_asset",
    description:
      "Re-roll a single generated asset from its stored request (fresh seed), or reproduce it exactly.",
    params: {
      assetId: { type: "string", required: true, description: "Asset id" },
      reproduce: { type: "boolean", description: "Replay the stored seed instead of re-rolling" },
    },
    costBearing: true,
    estimate: () => estimateCost({ action: "image", tier: "dev" }),
    execute: async (p) =>
      regenerateAsset({ assetId: str(p.assetId)!, reproduce: Boolean(p.reproduce) }),
  },
  {
    name: "generate_beat_clip",
    description: "Generate an AI video clip for one beat with a chosen model and duration.",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
      beatIdx: { type: "number", required: true, description: "Beat index (0-based)" },
      modelId: { type: "string", required: true, description: "Catalog video model id" },
      durationSec: { type: "number", required: true, description: "Clip duration in seconds" },
    },
    costBearing: true,
    estimate: (p) =>
      estimateCost({
        action: "clip",
        modelId: str(p.modelId) ?? "",
        durationSec: num(p.durationSec) ?? 5,
      }),
    execute: async (p) =>
      generateBeatVideo({
        videoId: str(p.videoId)!,
        beatIdx: num(p.beatIdx)!,
        modelId: str(p.modelId)!,
        durationSec: num(p.durationSec)!,
      }),
  },
  {
    name: "request_revision",
    description:
      "Send the open gate back a stage with revision notes (the old NEEDS_REVISION flow, now just another action).",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
      notes: { type: "string", required: true, description: "What to change" },
    },
    costBearing: true,
    estimate: () => null,
    execute: async (p, db) =>
      decideGate({ videoId: str(p.videoId)!, decision: "revision", notes: str(p.notes) }, db),
  },
  {
    name: "full_auto",
    description:
      "Autopilot this video end-to-end (idea to render) with QC-gated auto-approval.",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
      tier: { type: "string", description: "Auto tier (base/economy/premium/platinum); default base" },
    },
    costBearing: true,
    estimate: () => estimateStageCost({ status: "SCRIPT_READY", targetLengthSec: 300 }),
    execute: async (p) =>
      fullAutoGenerate({
        videoId: str(p.videoId)!,
        tier: (str(p.tier) ?? "base") as AutoTier,
      }),
  },
  {
    name: "auto_fix",
    description:
      "Run one auto-fix pass on this video now: QC re-reviews it and repairs the top flagged issue (regenerate/repair the failing artifact).",
    params: {
      projectId: { type: "string", required: true, description: "Project id" },
      videoId: { type: "string", required: true, description: "Video id" },
    },
    costBearing: true,
    estimate: () => estimateCost({ action: "qc-review" }),
    execute: async (p) => {
      const { runAutofixNowAction } = await import("@/lib/actions/autofix");
      const r = await runAutofixNowAction(str(p.projectId)!, str(p.videoId)!);
      return {
        ok: r.ok,
        error: r.error ?? r.reason,
        data: r.ok ? { kind: r.kind, score: r.score, changes: r.changes } : undefined,
      };
    },
  },
  {
    name: "get_spend",
    description:
      "Answer a spend question: total and recent provider costs for this video from the ledger. Read-only.",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
    },
    costBearing: false,
    estimate: () => null,
    execute: async (p, dbArg) => {
      const db = dbArg ?? (await createClient());
      const { data } = await db
        .from("cost_ledger")
        .select("provider, usd, description, at")
        .eq("video_id", str(p.videoId)!)
        .order("at", { ascending: false })
        .limit(50);
      const rows = (data ?? []) as { provider: string; usd: number; description: string }[];
      const total = rows.reduce((s, r) => s + Number(r.usd), 0);
      const byProvider: Record<string, number> = {};
      for (const r of rows) byProvider[r.provider] = (byProvider[r.provider] ?? 0) + Number(r.usd);
      return { ok: true, data: { totalUsd: Math.round(total * 100) / 100, byProvider, recent: rows.slice(0, 10) } };
    },
  },
  {
    name: "get_qc_summary",
    description:
      "Answer a QC question: the latest review scores, verdicts, and flagged issues for this video. Read-only.",
    params: {
      videoId: { type: "string", required: true, description: "Video id" },
    },
    costBearing: false,
    estimate: () => null,
    execute: async (p, dbArg) => {
      const db = dbArg ?? (await createClient());
      const { data } = await db
        .from("qc_reviews")
        .select("gate, score, verdict, issues, created_at, asset_id")
        .eq("video_id", str(p.videoId)!)
        .order("created_at", { ascending: false })
        .limit(20);
      return { ok: true, data: { reviews: data ?? [] } };
    },
  },
];

const BY_NAME = new Map(ACTIONS.map((a) => [a.name, a]));

export function listWorkspaceActions(): WorkspaceAction[] {
  return ACTIONS;
}

export function getWorkspaceAction(name: string): WorkspaceAction | undefined {
  return BY_NAME.get(name);
}

/**
 * The one dispatch path (buttons and router both land here): validate params
 * against the action's spec, then execute. Unknown action / bad params are
 * errors, never silent no-ops.
 */
export async function executeWorkspaceAction(
  name: string,
  params: Record<string, unknown>,
  db?: Db,
): Promise<ActionResult> {
  const action = BY_NAME.get(name);
  if (!action) return { ok: false, error: `Unknown workspace action "${name}"` };
  const invalid = validate(action, params);
  if (invalid) return { ok: false, error: invalid };
  return action.execute(params, db);
}
