import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runIntelligenceAllProjects } from "@/lib/pipeline/intelligence";
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
    return NextResponse.json({ ok: true, created, projects });
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
