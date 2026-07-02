import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { sweepOperator } from "@/lib/pipeline/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Auto Pilot Operator heartbeat. Pinged by the Auto Pilot GitHub Action. Ticks
 * every live operator run: rolls the 30-day budget cycle, and (for active runs
 * under budget whose daily slot is unfilled) seeds today's video via Build & Post.
 * The build-runner + auto-fix crons then carry it to a QC'd hold for approval.
 * Gated by CRON_SECRET when set.
 */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    const r = await sweepOperator();
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("cron operator failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
