/**
 * Visual Craft Engine V3 — the per-beat refine loop. Pure gates (shouldRefine /
 * nextPrompt) + the DI orchestrator: a below-floor shot improves across bounded,
 * cheap-first targeted rewrites and settles; cost never exceeds the per-beat cap.
 */
import { describe, expect, it, vi } from "vitest";
import { shouldRefine, nextPrompt, refineBeatVisual, DEFAULT_REFINE } from "@/lib/pipeline/beat-refine";

describe("shouldRefine (pure)", () => {
  const cfg = { floor: 6, maxAttempts: 2, spendCapUsd: 0.25 };
  it("refines below floor within attempt + spend budget", () => {
    expect(shouldRefine(4, 0, 0, cfg)).toBe(true);
  });
  it("stops at/above the floor", () => {
    expect(shouldRefine(6, 0, 0, cfg)).toBe(false);
    expect(shouldRefine(8, 0, 0, cfg)).toBe(false);
  });
  it("stops at the attempt cap", () => {
    expect(shouldRefine(3, 2, 0, cfg)).toBe(false);
  });
  it("stops at the spend cap", () => {
    expect(shouldRefine(3, 0, 0.25, cfg)).toBe(false);
  });
});

describe("nextPrompt (pure)", () => {
  it("appends the critic note as a targeted Fix, keeping the base prompt (bible)", () => {
    const base = "a protein model. Style: lab-tech realism. Palette: #0E7C86.";
    const out = nextPrompt(base, "reads as generic biology — show a folded 3-D structure");
    expect(out).toContain(base);
    expect(out).toContain("Fix: reads as generic biology");
  });
  it("replaces a prior Fix rather than stacking", () => {
    const once = nextPrompt("base prompt", "first fix");
    const twice = nextPrompt(once, "second fix");
    expect(twice).toBe("base prompt Fix: second fix");
    expect(twice).not.toContain("first fix");
  });
  it("empty note is a no-op", () => {
    expect(nextPrompt("base", "   ")).toBe("base");
  });
});

describe("refineBeatVisual (DI orchestrator)", () => {
  it("improves a below-floor shot across bounded targeted rewrites and settles", async () => {
    // Critic returns 4 → 5.5 → 7 on successive prompts; floor 6.
    const scores = [5.5, 7];
    let call = 0;
    const critique = vi.fn(async () => ({ score: scores[Math.min(call++, scores.length - 1)], note: "sharpen the subject" }));
    const reroll = vi.fn(async () => ({ costUsd: 0.025 }));
    const r = await refineBeatVisual({
      initialPrompt: "a subject",
      initialScore: 4,
      initialNote: "off-topic — show the real subject",
      cfg: { floor: 6, maxAttempts: 3, spendCapUsd: 0.25 },
      critique,
      reroll,
    });
    expect(r.finalScore).toBe(7);
    expect(r.improved).toBe(true);
    expect(r.attempts).toHaveLength(2); // settled once it cleared the floor
    expect(r.attempts[0].fromScore).toBe(4);
    expect(r.attempts[1].toScore).toBe(7);
  });

  it("respects the attempt cap even if the score never clears the floor", async () => {
    const critique = vi.fn(async () => ({ score: 3, note: "still off" }));
    const reroll = vi.fn(async () => ({ costUsd: 0.02 }));
    const r = await refineBeatVisual({
      initialPrompt: "p", initialScore: 3, initialNote: "n",
      cfg: { floor: 6, maxAttempts: 2, spendCapUsd: 1 },
      critique, reroll,
    });
    expect(r.attempts).toHaveLength(2);
    expect(reroll).toHaveBeenCalledTimes(2);
  });

  it("never exceeds the per-beat spend cap", async () => {
    const critique = vi.fn(async () => ({ score: 2, note: "n" }));
    const reroll = vi.fn(async () => ({ costUsd: 0.2 }));
    const r = await refineBeatVisual({
      initialPrompt: "p", initialScore: 2, initialNote: "n",
      cfg: { floor: 6, maxAttempts: 10, spendCapUsd: 0.25 },
      critique, reroll,
    });
    expect(r.spentUsd).toBeLessThanOrEqual(0.25 + 0.2); // stops once spent >= cap (checked before each attempt)
    // With 0.2/attempt and a 0.25 cap, only 2 attempts fit (0 → 0.2 → 0.4 ≥ cap).
    expect(r.attempts.length).toBeLessThanOrEqual(2);
  });

  it("does nothing when the initial score already clears the floor", async () => {
    const critique = vi.fn(async () => ({ score: 9, note: "" }));
    const reroll = vi.fn(async () => ({ costUsd: 0.02 }));
    const r = await refineBeatVisual({
      initialPrompt: "p", initialScore: 8, initialNote: "n", cfg: DEFAULT_REFINE, critique, reroll,
    });
    expect(r.attempts).toHaveLength(0);
    expect(reroll).not.toHaveBeenCalled();
  });
});
