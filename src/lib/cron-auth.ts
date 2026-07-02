import { NextResponse, type NextRequest } from "next/server";
import { secureEquals } from "@/lib/secure-compare";

/**
 * Shared bearer auth for the /api/cron/* routes (public in middleware).
 *
 * - CRON_SECRET set   → the caller must present it as an
 *   `Authorization: Bearer` token (header only — query params land in
 *   access/proxy logs). Both sides are trimmed: a secret pasted with a
 *   trailing newline (GitHub secrets keep them) must still match. The
 *   comparison is constant-time.
 * - CRON_SECRET unset → allowed only outside hosted deployments. Locally
 *   (no VERCEL env) the routes run freely so the mock stack needs zero
 *   config; on Vercel an unset secret fails CLOSED (503) instead of
 *   leaving spend-triggering endpoints open to the internet.
 *
 * Returns the error response to send, or null when the request may proceed.
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.VERCEL) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not configured" },
        { status: 503 },
      );
    }
    return null; // local/mock: run freely
  }
  const auth = request.headers.get("authorization");
  const fromHeader = auth?.replace(/^Bearer\s+/i, "").trim();
  if (!secureEquals(fromHeader, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
