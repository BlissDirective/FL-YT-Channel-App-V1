import { NextResponse, type NextRequest } from "next/server";
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
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const fromHeader = auth?.replace(/^Bearer\s+/i, "").trim();
    const fromQuery = request.nextUrl.searchParams.get("key")?.trim();
    if (fromHeader !== secret && fromQuery !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
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
