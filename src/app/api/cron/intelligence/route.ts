import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runIntelligenceAllProjects } from "@/lib/pipeline/intelligence";
import { runOperatorSignalMining } from "@/lib/pipeline/operator-signal";
import { isKillSwitchOn } from "@/lib/pipeline/engine";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily intelligence run for every active project (Phase 8). Public route
    (see middleware) gated by CRON_SECRET — same scheme as refresh-stats. */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    // Emergency stop covers paid daily scouting too.
    if (await isKillSwitchOn(createAdminClient())) {
      return NextResponse.json({ ok: true, skipped: "kill-switch" });
    }
    const { created, projects } = await runIntelligenceAllProjects();
    // Operator-signal learning (Director Mode §7.2): mine the decision ledger
    // into memory lessons. Read-only over the autonomous pipeline (it only reads
    // operator_decisions + writes memory), so it runs on the same daily cadence
    // regardless of mode. Best-effort — never fail the cron on a mining error.
    let signal = { projects: 0, lessons: 0 };
    try {
      signal = await runOperatorSignalMining();
    } catch (err) {
      console.error("operator-signal mining failed (non-fatal):", err);
    }
    return NextResponse.json({ ok: true, created, projects, signal });
  } catch (err) {
    console.error("cron intelligence failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
