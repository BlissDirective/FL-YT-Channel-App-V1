import "server-only";
import type { TestableService } from "./health";

/**
 * Live credential probes (Phase 9 hardening). Each does the cheapest
 * authenticated call that proves the key works, so the settings "Test"
 * button reports real connectivity, not just env-var presence. Never throws —
 * returns a structured result.
 */

export type TestResult = { ok: boolean; detail: string; latencyMs?: number };

export async function testCredential(service: TestableService): Promise<TestResult> {
  const key = (name: string) => process.env[name];
  const started = Date.now();
  const done = (ok: boolean, detail: string): TestResult => ({ ok, detail, latencyMs: Date.now() - started });

  try {
    switch (service) {
      case "anthropic": {
        const k = key("ANTHROPIC_API_KEY");
        if (!k) return done(false, "Not configured");
        const r = await fetch("https://api.anthropic.com/v1/models?limit=1", {
          headers: { "x-api-key": k, "anthropic-version": "2023-06-01" },
        });
        return done(r.ok, r.ok ? "Authenticated" : `HTTP ${r.status}`);
      }
      case "elevenlabs": {
        const k = key("ELEVENLABS_API_KEY");
        if (!k) return done(false, "Not configured");
        const r = await fetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": k } });
        return done(r.ok, r.ok ? "Authenticated" : `HTTP ${r.status}`);
      }
      case "pexels": {
        const k = key("PEXELS_API_KEY");
        if (!k) return done(false, "Not configured");
        const r = await fetch("https://api.pexels.com/v1/search?query=test&per_page=1", {
          headers: { Authorization: k },
        });
        return done(r.ok, r.ok ? "Authenticated" : `HTTP ${r.status}`);
      }
      case "youtube": {
        const k = key("YOUTUBE_API_KEY") || key("YOUTUBE_DATA_API_V3");
        if (!k) return done(false, "Not configured");
        const r = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${k}`,
        );
        return done(r.ok, r.ok ? "Authenticated" : `HTTP ${r.status}`);
      }
      case "fal": {
        const k = key("FAL_KEY");
        if (!k) return done(false, "Not configured");
        // fal has no cheap unauthenticated-safe list endpoint; a malformed key
        // is rejected at the queue with 401, so we probe the queue health.
        const r = await fetch("https://queue.fal.run/health", {
          headers: { Authorization: `Key ${k}` },
        });
        // Any non-401/403 means the key was accepted (404 on health is fine).
        const ok = r.status !== 401 && r.status !== 403;
        return done(ok, ok ? "Key accepted" : `HTTP ${r.status}`);
      }
      default:
        return done(false, "No probe for this service");
    }
  } catch (err) {
    return done(false, err instanceof Error ? err.message.slice(0, 80) : "Request failed");
  }
}
