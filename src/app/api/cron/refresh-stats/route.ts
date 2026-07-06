import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { refreshTrackedStats } from "@/lib/stats";
import { reconcileLedger } from "@/lib/pipeline/ledger";
import { runOutcomeAuditAllProjects } from "@/lib/pipeline/outcome-audit";
import { runLibrarian } from "@/lib/pipeline/memory-service";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Nightly stats ingestion endpoint (Phase 7), hit by the stats-refresh
 * GitHub Action. Public route (see middleware) but gated by CRON_SECRET:
 * when the secret is set, callers must present it as a Bearer token or
 * `?key=`. When it's unset (local/mock), the route runs freely so the
 * feature is testable without configuration.
 */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const { refreshed } = await refreshTrackedStats();
    // Nightly ledger reconciliation (Phase 2): repair videos whose running
    // total drifted from the cost_ledger truth so budget guards don't lie.
    let repaired = 0;
    try {
      ({ repaired } = await reconcileLedger(createAdminClient()));
    } catch (err) {
      console.error("ledger reconciliation failed:", err);
    }
    // Outcome-audit (Harness C3): correlate FINAL-QC scores with actual
    // views/retention so a judge that stops predicting outcomes is caught.
    let audits = { projects: 0, wrote: 0 };
    try {
      audits = await runOutcomeAuditAllProjects();
    } catch (err) {
      console.error("outcome audit failed:", err);
    }
    // C8 librarian: nightly cross-channel curation — global-craft promotion
    // (≥3-channel technique lessons) + a decayed-lesson retire sweep.
    let librarian = { promotedGlobal: 0, retired: 0, synthesized: 0 };
    try {
      librarian = await runLibrarian(createAdminClient());
    } catch (err) {
      console.error("librarian pass failed:", err);
    }
    return NextResponse.json({ ok: true, refreshed, ledgerRepaired: repaired, outcomeAudits: audits.wrote, librarian });
  } catch (err) {
    console.error("cron refresh-stats failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
