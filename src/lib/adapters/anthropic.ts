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

export async function anthropicFetch(init: RequestInit): Promise<Response> {
  let res = await fetch(URL, init);
  if (!res.ok && RETRYABLE.has(res.status)) {
    await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
    res = await fetch(URL, init);
  }
  return res;
}
