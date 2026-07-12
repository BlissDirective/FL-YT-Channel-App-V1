import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runEditingResearch } from "@/lib/pipeline/editing-research";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Weekly editing-craft research producer (MVDA §11, KD4). All the real
    gates — kill switch, C4 (≥5 agent cuts), the $20/mo research cap — live
    inside runEditingResearch so a manual invocation obeys them too. */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  try {
    const result = await runEditingResearch();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (err) {
    console.error("cron editing-research failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
