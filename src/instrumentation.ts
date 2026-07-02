/**
 * Next.js instrumentation hooks. `onRequestError` fires for every uncaught
 * server-side error (RSC render, route handlers, server actions) — forwarded
 * to the DSN-gated reporter (no-op without SENTRY_DSN).
 */

export async function register(): Promise<void> {
  /* no startup instrumentation needed */
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routeType: string },
): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/error-reporter");
  await reportError(err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
}
