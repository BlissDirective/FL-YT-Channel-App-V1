import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBeatAvatar } from "@/lib/pipeline/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Admin utility: render ONE beat as a lip-synced presenter avatar, directly —
 * a reliable path that bypasses the workspace composer's intent routing and
 * confirm flow. Runs the fal avatar call server-side inside a 300s function
 * (one Kling/OmniHuman clip fits comfortably), then returns the real result or
 * error so failures are visible rather than silently swallowed by the composer.
 *
 * POST { videoId, beatIdx, modelId? } → generateBeatAvatar result JSON.
 * Idempotent: re-running a beat archives the old clip and replaces it.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: { videoId?: string; beatIdx?: number; modelId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.videoId || body.beatIdx == null) {
    return NextResponse.json({ ok: false, error: "videoId and beatIdx required" }, { status: 400 });
  }

  try {
    const result = await generateBeatAvatar({
      videoId: body.videoId,
      beatIdx: Number(body.beatIdx),
      modelId: body.modelId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
