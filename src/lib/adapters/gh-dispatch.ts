import "server-only";

/**
 * Trigger GitHub Actions workflows on demand (workflow_dispatch). GitHub heavily
 * THROTTLES scheduled (cron) workflows on free/Hobby usage — they fire ~hourly
 * instead of on their stated interval — which compounds across the build-runner →
 * render → clips hops and makes videos crawl. Dispatched runs are NOT throttled,
 * so the build-runner kicks the render/clip WORKERS the moment there's pending
 * work, collapsing the multi-hour wait to minutes.
 *
 * Gated on a GITHUB_DISPATCH_TOKEN (a fine-grained PAT with Actions: read+write
 * on the repo). No token → no-op, so this is safe to ship before it's configured.
 */

const REPO = process.env.GITHUB_REPO?.trim() || "BlissDirective/FL-YT-Channel-App-V1";
const REF = process.env.GITHUB_DISPATCH_REF?.trim() || "main";

export function ghDispatchConfigured(): boolean {
  return Boolean(process.env.GITHUB_DISPATCH_TOKEN);
}

/** Dispatch a workflow by its file name (e.g. "render.yml"). Returns true on success. */
export async function dispatchWorkflow(file: string): Promise<boolean> {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();
  if (!token) return false;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${file}/dispatches`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
          "user-agent": "faceless-studio",
        },
        body: JSON.stringify({ ref: REF }),
      },
    );
    if (!res.ok && res.status !== 204) {
      console.error(`gh-dispatch ${file} HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`gh-dispatch ${file} failed:`, err);
    return false;
  }
}
