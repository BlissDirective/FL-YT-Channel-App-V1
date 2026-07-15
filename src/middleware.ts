import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// /api/cron (CRON_SECRET), /api/mcp (STUDIO_MCP_TOKEN), and /api/telegram (the
// webhook's secret-token + chat-id lock; register's CRON_SECRET) all carry their
// own auth, so they bypass the session gate. (Telegram must be able to POST the
// webhook without a logged-in session.)
// Public marketing surfaces (/launch, /legal/*) are reachable without a
// session; the waitlist action runs anon and is fenced by RLS. Everything else
// stays gated. /login and the token-authed API routes carry their own auth.
const PUBLIC_PATHS = [
  "/launch",
  "/legal",
  "/login",
  "/api/cron",
  "/api/mcp",
  "/api/telegram",
];

export async function middleware(request: NextRequest) {
  const url = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;

  // Unconfigured: in local dev, let everything through so the setup notice
  // shows. In production (Vercel or any hosted build), missing Supabase config
  // means auth can't be enforced — fail CLOSED (503) rather than serving the
  // whole control panel unauthenticated.
  if (!url || !anonKey) {
    const hosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
    if (hosted) {
      return new NextResponse("Service unavailable — auth is not configured.", { status: 503 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
