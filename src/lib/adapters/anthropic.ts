import "server-only";

/**
 * Shared fetch for the Anthropic Messages API with bounded retry
 * (Enhancement Plan Phase 3.5). Rate limits (429) and overload (529/5xx)
 * previously failed straight through — degrading a script to mock or
 * consuming a revision on a transient blip. One retry with backoff mirrors
 * the fal adapter's policy. Non-ok responses are RETURNED (not thrown) so
 * every existing call site keeps its own error handling.
 */
const URL = "https://api.anthropic.com/v1/messages";
const RETRYABLE = new Set([429, 500, 502, 503, 529]);

// A hung socket previously blocked the serverless invocation to its full
// maxDuration (300s) and stranded the video mid-stage — the runPipeline
// catch only fires on a throw, never on a hang. 120s comfortably covers the
// largest script/QC generations while leaving the route headroom to fail,
// hold the video, and surface the error.
const TIMEOUT_MS = 120_000;

export async function anthropicFetch(init: RequestInit): Promise<Response> {
  const attempt = () => fetch(URL, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  try {
    const res = await attempt();
    if (!res.ok && RETRYABLE.has(res.status)) {
      await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
      return await attempt();
    }
    return res;
  } catch (err) {
    // Timeouts/aborts are as transient as a 529 — give it the same one retry.
    if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
      await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
      return await attempt();
    }
    throw err;
  }
}
