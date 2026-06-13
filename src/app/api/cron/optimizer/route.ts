import { NextResponse, type NextRequest } from "next/server";
import { runOptimizerAllProjects } from "@/lib/pipeline/optimizer";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly Optimizer run for every active project (Phase 8). Public route
    (see middleware) gated by CRON_SECRET — same scheme as refresh-stats. */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const fromHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const fromQuery = request.nextUrl.searchParams.get("key")?.trim();
    if (fromHeader !== secret && fromQuery !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }
  try {
    const { created, projects } = await runOptimizerAllProjects();
    return NextResponse.json({ ok: true, created, projects });
  } catch (err) {
    console.error("cron optimizer failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
