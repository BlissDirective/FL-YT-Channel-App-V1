import "server-only";

/**
 * Minimal production error reporting (Enhancement Plan Phase 1.6).
 *
 * Posts errors to Sentry's envelope endpoint using nothing but fetch — no
 * SDK, no build plugin, no sourcemap upload. Active only when SENTRY_DSN is
 * set; otherwise a no-op (console remains the local story). The fal-balance
 * outage ran for two weeks unnoticed — this is the alerting hook.
 */

type Dsn = { host: string; projectId: string; key: string };

function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const projectId = u.pathname.replace(/^\//, "");
    if (!u.username || !projectId) return null;
    return { host: u.host, projectId, key: u.username };
  } catch {
    return null;
  }
}

export function errorReportingEnabled(): boolean {
  return parseDsn(process.env.SENTRY_DSN) !== null;
}

/** Fire-and-forget: report an error with optional context tags. Never throws. */
export async function reportError(
  err: unknown,
  context: Record<string, string | undefined> = {},
): Promise<void> {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return;
  try {
    const eventId = crypto.randomUUID().replaceAll("-", "");
    const now = new Date().toISOString();
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const event = {
      event_id: eventId,
      timestamp: now,
      platform: "node",
      level: "error",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
      tags: Object.fromEntries(Object.entries(context).filter(([, v]) => v)),
      exception: {
        values: [
          {
            type: err instanceof Error ? err.name : "Error",
            value: message.slice(0, 1000),
            ...(stack ? { raw_stacktrace: undefined, value: `${message.slice(0, 500)}\n${stack.slice(0, 2000)}` } : {}),
          },
        ],
      },
    };
    const envelope =
      JSON.stringify({ event_id: eventId, sent_at: now }) +
      "\n" +
      JSON.stringify({ type: "event" }) +
      "\n" +
      JSON.stringify(event) +
      "\n";
    await fetch(
      `https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.key}&sentry_version=7`,
      {
        method: "POST",
        headers: { "content-type": "application/x-sentry-envelope" },
        body: envelope,
        signal: AbortSignal.timeout(3000),
      },
    );
  } catch {
    /* reporting must never take the app down with it */
  }
}
