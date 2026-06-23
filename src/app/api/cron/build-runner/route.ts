import { NextResponse, type NextRequest } from "next/server";
import { processPendingBuildVideos } from "@/lib/pipeline/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Build-runner cron (Full-Auto Build & Post, Phase 0). Pinged by the
 * Build Runner GitHub Action; claims one pending build-run seed video and
 * drives it through script → Full Auto-Generate → render. Public route (see
 * middleware) gated by CRON_SECRET when set; runs freely when unset (local/mock).
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
    const { processed, errors } = await processPendingBuildVideos(1);
    return NextResponse.json({ ok: true, processed, errors });
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
