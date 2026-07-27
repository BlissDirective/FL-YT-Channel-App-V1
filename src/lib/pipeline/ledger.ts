import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Project, Video } from "@/lib/db/types";

/**
 * The one spend module (Enhancement Plan Phase 2). Every paid provider call
 * routes its ledger write through `recordCost`, and every spender checks
 * `checkBudget` (ideally with the amount it is about to spend) BEFORE the
 * call. Previously three near-identical recordCost implementations and three
 * unreconciled budget meters lived in engine/operator/autofix.
 */

type Db = ReturnType<typeof createAdminClient>;

export type SpendCheck = { ok: true } | { ok: false; reason: string };

export type LedgerEntry = {
  provider: string;
  usd: number;
  description: string;
};

/**
 * Insert a ledger row and bump the video's running total (kept in the passed
 * object too, so mid-stage budget checks see intra-stage spend without a
 * re-fetch). No-op for zero/negative amounts.
 */
export async function recordCost(
  db: Db,
  video: Pick<Video, "id" | "project_id" | "total_cost_usd"> & { total_cost_usd: number | string },
  cost: LedgerEntry,
  detail?: string,
): Promise<void> {
  if (cost.usd <= 0) return;
  await db.from("cost_ledger").insert({
    project_id: video.project_id,
    video_id: video.id,
    provider: cost.provider,
    description: detail ? `${cost.description} — ${detail}` : cost.description,
    usd: cost.usd,
  });
  const next = Number(video.total_cost_usd) + cost.usd;
  await db.from("videos").update({ total_cost_usd: next }).eq("id", video.id);
  video.total_cost_usd = next;
}

// ── Editing-craft research budget (MVDA §11, KD4) ─────────────────────
// A fully SEPARATE budget line: research spend ledgers at SYSTEM scope
// (project_id null, provider 'research') so it never enters monthSpend()
// or any project/video cap, and production spend never eats the research cap.

export const RESEARCH_MONTHLY_CAP_USD = Number(process.env.RESEARCH_MONTHLY_CAP_USD) > 0
  ? Number(process.env.RESEARCH_MONTHLY_CAP_USD)
  : 20;

/** Month-to-date research spend (system scope only). */
export async function researchMonthSpend(db: Db): Promise<number> {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .is("project_id", null)
    .eq("provider", "research")
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Ledger a research run at system scope. No video/project totals change. */
export async function recordResearchCost(db: Db, usd: number, description: string): Promise<void> {
  if (usd <= 0) return;
  await db.from("cost_ledger").insert({
    project_id: null,
    video_id: null,
    provider: "research",
    description,
    usd,
  });
}

// ── Character Studio design budget (Character Studio §2, decision Q10) ──
// Also a separate line: designing a character is not producing a video, so it
// ledgers at SYSTEM scope and never enters monthSpend() or a project cap. The
// per-character total drives the Studio's running meter, which WARNS at the
// soft budget and never blocks — the operator decides when a character is
// worth another twenty candidates.

export const CHARACTER_SOFT_BUDGET_USD = Number(process.env.CHARACTER_SOFT_BUDGET_USD) > 0
  ? Number(process.env.CHARACTER_SOFT_BUDGET_USD)
  : 8;

/** Ledger a Character Studio generation, attributed to the character. */
export async function recordCharacterCost(
  db: Db,
  characterId: string,
  cost: LedgerEntry,
): Promise<void> {
  if (cost.usd <= 0) return;
  await db.from("cost_ledger").insert({
    project_id: null,
    video_id: null,
    character_id: characterId,
    provider: cost.provider,
    description: cost.description,
    usd: cost.usd,
  });
}

/** Lifetime design spend on one character (the Studio's meter). */
export async function characterSpend(db: Db, characterId: string): Promise<number> {
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("character_id", characterId);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Month-to-date ledger spend for a project. */
export async function monthSpend(db: Db, projectId: string): Promise<number> {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("project_id", projectId)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/**
 * The budget gate. `aboutToSpendUsd` lets call sites reserve the estimated
 * cost of the upcoming call instead of only noticing an overrun after the
 * money is gone. Checks the per-video cap (using the in-memory running total
 * `recordCost` maintains) and the project's monthly cap.
 */
export async function checkBudget(
  db: Db,
  project: Pick<Project, "id" | "budget">,
  video: Pick<Video, "total_cost_usd">,
  aboutToSpendUsd = 0,
): Promise<SpendCheck> {
  const perVideo = Number(project.budget?.perVideoUsd ?? Infinity);
  if (Number(video.total_cost_usd) + aboutToSpendUsd > perVideo) {
    return { ok: false, reason: `Per-video budget reached ($${perVideo})` };
  }
  const monthly = Number(project.budget?.monthlyUsd ?? Infinity);
  if ((await monthSpend(db, project.id)) + aboutToSpendUsd > monthly) {
    return { ok: false, reason: `Monthly budget reached ($${monthly})` };
  }
  return { ok: true };
}

/**
 * Nightly reconciliation: `videos.total_cost_usd` is a running counter bumped
 * on every recordCost; drift (crashed processes, manual edits) makes budget
 * guards lie. Recomputes each active video's total from the ledger and
 * repairs rows that differ by more than a cent. Returns repaired count.
 */
export async function reconcileLedger(db: Db, limit = 200): Promise<{ repaired: number }> {
  const { data: videos } = await db
    .from("videos")
    .select("id, total_cost_usd")
    .order("updated_at", { ascending: false })
    .limit(limit);
  let repaired = 0;
  for (const v of videos ?? []) {
    const { data: rows } = await db.from("cost_ledger").select("usd").eq("video_id", v.id);
    const truth = (rows ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
    if (Math.abs(truth - Number(v.total_cost_usd)) > 0.01) {
      await db.from("videos").update({ total_cost_usd: truth }).eq("id", v.id);
      repaired += 1;
    }
  }
  return { repaired };
}
