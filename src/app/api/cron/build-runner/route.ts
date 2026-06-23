import { NextResponse, type NextRequest } from "next/server";
import { finalizeAutoPilotVideos, processPendingBuildVideos } from "@/lib/pipeline/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Build-runner cron (Full-Auto Build & Post). Pinged by the Build Runner
 * GitHub Action. Two units of work per pass:
 *   1. finalizeAutoPilotVideos — QC-gate rendered auto-pilot videos at the
 *      Final gate (Phase 1): score → privacy (Public/Unlisted) or Held.
 *   2. processPendingBuildVideos — claim one pending seed video and drive it
 *      through script (QC-gated, revise-once) → Full Auto-Generate → render.
 * Public route (see middleware) gated by CRON_SECRET when set; runs freely
 * when unset (local/mock).
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
    // Finalize first (cheap: advances already-rendered cuts), then do the one
    // heavy generation step so the pass stays within its time budget.
    const fin = await finalizeAutoPilotVideos(5);
    const { processed, errors, held } = await processPendingBuildVideos(1);
    return NextResponse.json({
      ok: true,
      processed,
      errors,
      heldAtScript: held,
      finalized: fin.finalized,
      heldAtFinal: fin.held,
    });
  } catch (err) {
    console.error("cron build-runner failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
