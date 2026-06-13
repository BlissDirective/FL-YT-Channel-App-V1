import { NextResponse, type NextRequest } from "next/server";
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
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const fromHeader = auth?.replace(/^Bearer\s+/i, "");
    const fromQuery = request.nextUrl.searchParams.get("key");
    if (fromHeader !== secret && fromQuery !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

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
