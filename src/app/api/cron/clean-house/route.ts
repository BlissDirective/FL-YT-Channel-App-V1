import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { driveAllCleanHouseRuns } from "@/lib/pipeline/clean-house-runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Clean House auto-advance heartbeat. Pinged by the Clean House GitHub Action.
 * Ticks every `running` Clean House run one step — advancing salvageable assets
 * through the existing gate/stage machinery (bounded by the per-run budget
 * ceiling, concurrency throttle, stall handling, and termination rails), and
 * flagging the unfixable. Never publishes; never auto-kills. Each run's atomic
 * lock keeps this safe against a concurrent "Advance now" click. CRON_SECRET-
 * guarded.
 */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    const r = await driveAllCleanHouseRuns();
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("cron clean-house failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
