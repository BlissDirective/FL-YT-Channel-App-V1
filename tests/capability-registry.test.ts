/**
 * Capability registry (Batch 3) — resolving what's available vs. locked from
 * the present services, with effort + stability metadata intact.
 */
import { describe, expect, it } from "vitest";
import { CAPABILITIES, capabilitySummary, computeCapabilities } from "@studio/core";

describe("computeCapabilities", () => {
  it("marks a capability available only when ALL its services are present", () => {
    const statuses = computeCapabilities({ fal: true, supabase: true });
    const aiVideo = statuses.find((s) => s.id === "ai-video")!;
    expect(aiVideo.available).toBe(true);
    expect(aiVideo.missing).toEqual([]);
    const voice = statuses.find((s) => s.id === "voiceover")!;
    expect(voice.available).toBe(false);
    expect(voice.missing).toContain("elevenlabs");
  });

  it("reports a summary of available / total", () => {
    const none = capabilitySummary(computeCapabilities({}));
    expect(none.available).toBe(0);
    expect(none.total).toBe(CAPABILITIES.length);
    const some = capabilitySummary(computeCapabilities({ supabase: true, anthropic: true }));
    expect(some.available).toBe(2);
  });

  it("every capability declares effort + stability + unlock steps", () => {
    for (const c of CAPABILITIES) {
      expect(["env", "install", "hardware"]).toContain(c.effort);
      expect(["production", "beta", "test"]).toContain(c.stability);
      expect(c.unlock.length).toBeGreaterThan(0);
      expect(c.requires.length).toBeGreaterThan(0);
    }
  });
});
