import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitBeatAvatar, finishBeatAvatar } from "@/lib/pipeline/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Admin utility: render a beat as a lip-synced presenter avatar via the ASYNC
 * job flow, bypassing the composer. Kling/OmniHuman clips can render longer than
 * any single request can wait, so this is two-phase:
 *   mode:"submit" → queue the fal job (returns immediately, pending:true)
 *   mode:"finish" → poll it once; pending until it's rendered, then swaps in the
 *                   real avatar clip. Call finish repeatedly until done:true.
 *
 * POST { videoId, beatIdx, mode:"submit"|"finish", modelId? } → result JSON.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: { videoId?: string; beatIdx?: number; modelId?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.videoId || body.beatIdx == null) {
    return NextResponse.json({ ok: false, error: "videoId and beatIdx required" }, { status: 400 });
  }

  try {
    const result =
      body.mode === "finish"
        ? await finishBeatAvatar({ videoId: body.videoId, beatIdx: Number(body.beatIdx) })
        : await submitBeatAvatar({ videoId: body.videoId, beatIdx: Number(body.beatIdx), modelId: body.modelId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
