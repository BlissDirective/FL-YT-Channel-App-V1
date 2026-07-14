import { NextResponse } from "next/server";
import { getNeedsYouCount } from "@/lib/db/triage";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Live "needs you" count for a project (Feed nav badge #6). Auth'd by the user
 * session — RLS scopes the underlying reads to the owner. Small JSON so the
 * client nav can poll it cheaply.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 }, { status: 401 });
  try {
    const count = await getNeedsYouCount(id);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
