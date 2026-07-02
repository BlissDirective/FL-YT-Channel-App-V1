import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { sweepAutofix } from "@/lib/pipeline/autofix";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Auto-fix loop cron. Pinged by the Auto-Fix GitHub Action. Scans videos at
 * FINAL_REVIEW whose channel has the loop enabled and advances each one step:
 * critique → (below threshold) apply one fix + re-render → re-critique next pass,
 * bounded by the per-project max re-renders and spend cap, then hold for manual
 * review. The build-runner cron also runs a sweep before its finalizer so
 * auto-pilot videos are fixed before they publish. Gated by CRON_SECRET when set.
 */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    const r = await sweepAutofix(8);
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("cron auto-fix failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
