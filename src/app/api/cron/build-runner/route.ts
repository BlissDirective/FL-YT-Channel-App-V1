import { NextResponse, type NextRequest } from "next/server";
import {
  finalizeAutoPilotVideos,
  processPendingBuildVideos,
  reconcileBuildRuns,
  reconcileStuckRenders,
  releaseScheduledVideos,
} from "@/lib/pipeline/engine";
import { sweepAutofix } from "@/lib/pipeline/autofix";
import { sweepOperator } from "@/lib/pipeline/operator";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Build-runner cron (Full-Auto Build & Post). Pinged by the Build Runner
 * GitHub Action. Three units of work per pass:
 *   1. releaseScheduledVideos — flag approved auto-pilot videos whose publish
 *      slot is due (Phase 2) → the render farm uploads them at their privacy.
 *   2. finalizeAutoPilotVideos — QC-gate rendered auto-pilot videos at the
 *      Final gate (Phase 1): score → privacy (Public/Unlisted) or Held.
 *   3. processPendingBuildVideos — claim one pending seed video and drive it
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
    // Cheap passes first (release due slots, finalize rendered cuts, heal any
    // render-stranded videos), then the heavy generation step under a wall-clock
    // budget so a pass never hard-times-out mid-video and strands it.
    const rel = await releaseScheduledVideos(6);
    // Auto Pilot Operator tick here too (not just the sparse auto-pilot cron):
    // seeds the daily video, and — crucially — sends Telegram approval cards and
    // runs auto-approve PROMPTLY (within this 5-min loop) once a video settles.
    let operator = { ticked: 0, seeded: 0 };
    try {
      operator = await sweepOperator(createAdminClient());
    } catch (err) {
      console.error("build-runner operator sweep failed:", err);
    }
    // Auto-fix sweep BEFORE the finalizer so a weak auto-pilot cut is fixed
    // (and re-rendering, hence no longer at FINAL_REVIEW) before it can publish.
    let autofix = { scanned: 0, fixed: 0, done: 0, held: 0 };
    try {
      autofix = await sweepAutofix(8, createAdminClient());
    } catch (err) {
      console.error("build-runner autofix sweep failed:", err);
    }
    const fin = await finalizeAutoPilotVideos(5);
    const heal = await reconcileStuckRenders();
    // Drain up to 3 seeds per pass, but stop ~210s in (the route caps at 300s;
    // leave headroom for the steps above/below). Remaining seeds wait one pass.
    const { processed, errors, held } = await processPendingBuildVideos(3, undefined, {
      budgetMs: 210_000,
    });
    // Reconcile run lifecycle last (after this pass's state changes) so a
    // completion alert reflects the freshest video states.
    const rec = await reconcileBuildRuns();
    return NextResponse.json({
      ok: true,
      released: rel.released,
      processed,
      errors,
      heldAtScript: held,
      finalized: fin.finalized,
      heldAtFinal: fin.held,
      healedStuck: heal.healed,
      runsUpdated: rec.updated,
      runsCompleted: rec.completed,
      autofixFixed: autofix.fixed,
      autofixDone: autofix.done,
      autofixHeld: autofix.held,
      operatorTicked: operator.ticked,
      operatorSeeded: operator.seeded,
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
