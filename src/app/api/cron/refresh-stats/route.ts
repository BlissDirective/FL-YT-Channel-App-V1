import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { refreshTrackedStats } from "@/lib/stats";

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
    return NextResponse.json({ ok: true, refreshed });
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
