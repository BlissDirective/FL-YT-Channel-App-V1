/**
 * memory.ts — the Studio Memory Service governance core (Harness C8). The write
 * policy (evidence-gated), reinforcement, confidence decay + revival, pin
 * exemption, outcome-floor retirement, and top-k retrieval are all pure and
 * safety-critical for the cross-agent learning loop, so they're exercised
 * directly. Supersedes the C4 playbook's hard 40-cap / 90-day-expiry tests.
 */
import { describe, expect, it } from "vitest";
import {
  DECAY_HALFLIFE_DAYS,
  decayedConfidence,
  enforceSafetyCap,
  recurringIssues,
  retireStale,
  topByConfidence,
  upsertEntry,
  type MemoryEntry,
  type MemoryNamespace,
} from "@/lib/pipeline/memory";

const NOW = "2026-07-05T00:00:00.000Z";
const daysAgo = (n: number) => new Date(new Date(NOW).getTime() - n * 86_400_000).toISOString();

const entry = (over: Partial<MemoryEntry> = {}): MemoryEntry => ({
  id: over.id ?? "e",
  namespace: over.namespace ?? "script",
  text: over.text ?? "Tighten the hook",
  confidence: over.confidence ?? 0.4,
  evidence: over.evidence ?? "autofix +1.0 QC",
  evidenceCount: over.evidenceCount ?? 1,
  pinned: over.pinned ?? false,
  status: over.status ?? "active",
  createdAt: over.createdAt ?? NOW,
  lastConfirmedAt: over.lastConfirmedAt ?? NOW,
});

describe("upsertEntry — evidence-gated write policy", () => {
  it("refuses a lesson with no evidence", () => {
    const out = upsertEntry([], { namespace: "script", text: "Do a thing", evidence: "" }, NOW, "id1");
    expect(out).toHaveLength(0);
  });

  it("adds a new evidence-backed lesson", () => {
    const out = upsertEntry(
      [],
      { namespace: "script", text: "Open on the payoff", evidence: "retention +6%" },
      NOW,
      "id1",
    );
    expect(out).toHaveLength(1);
    expect(out[0].evidenceCount).toBe(1);
    expect(out[0].status).toBe("active");
  });

  it("reinforces a matching lesson instead of duplicating (confidence rises, count bumps, revives)", () => {
    const start = [entry({ text: "Open the video on the payoff promise", confidence: 0.4, lastConfirmedAt: daysAgo(200) })];
    const out = upsertEntry(
      start,
      { namespace: "script", text: "Open on the payoff promise immediately", evidence: "retention +4%" },
      NOW,
      "id2",
    );
    expect(out).toHaveLength(1);
    expect(out[0].evidenceCount).toBe(2);
    expect(out[0].confidence).toBeGreaterThan(0.4);
    expect(out[0].confidence).toBeLessThanOrEqual(1);
    expect(out[0].lastConfirmedAt).toBe(NOW); // reconfirmation refreshes the clock
  });

  it("keeps lessons in different namespaces separate even with identical text", () => {
    const start = [entry({ namespace: "script", text: "Vary the shots" })];
    const out = upsertEntry(start, { namespace: "visual", text: "Vary the shots", evidence: "autofix +0.8" }, NOW, "id3");
    expect(out).toHaveLength(2);
  });

  it("revives a retired lesson when fresh evidence arrives", () => {
    const start = [entry({ text: "Cold open under three seconds", status: "retired" })];
    const out = upsertEntry(
      start,
      { namespace: "script", text: "Cold open under three seconds always", evidence: "retention +5%" },
      NOW,
      "id4",
    );
    expect(out[0].status).toBe("active");
  });
});

describe("decayedConfidence", () => {
  it("halves confidence after one half-life", () => {
    const d = decayedConfidence(entry({ confidence: 0.8, lastConfirmedAt: daysAgo(DECAY_HALFLIFE_DAYS) }), NOW);
    expect(d).toBeCloseTo(0.4, 5);
  });

  it("does not decay a pinned lesson", () => {
    const d = decayedConfidence(entry({ confidence: 0.8, pinned: true, lastConfirmedAt: daysAgo(10 * DECAY_HALFLIFE_DAYS) }), NOW);
    expect(d).toBe(0.8);
  });

  it("is full strength at the moment of confirmation", () => {
    expect(decayedConfidence(entry({ confidence: 0.6, lastConfirmedAt: NOW }), NOW)).toBeCloseTo(0.6, 6);
  });
});

describe("retireStale — outcome-floor retirement (not hard time expiry)", () => {
  it("retires an unpinned lesson whose decayed confidence fell below the floor", () => {
    // 0.5 over ~10 half-lives decays far below the 0.12 floor.
    const out = retireStale([entry({ id: "faded", confidence: 0.5, lastConfirmedAt: daysAgo(10 * DECAY_HALFLIFE_DAYS) })], NOW);
    expect(out).toHaveLength(0);
  });

  it("keeps a decayed-but-pinned lesson forever", () => {
    const out = retireStale([entry({ id: "pin", confidence: 0.5, pinned: true, lastConfirmedAt: daysAgo(50 * DECAY_HALFLIFE_DAYS) })], NOW);
    expect(out.map((e) => e.id)).toEqual(["pin"]);
  });

  it("keeps a recently-confirmed lesson", () => {
    const out = retireStale([entry({ id: "fresh", confidence: 0.4, lastConfirmedAt: daysAgo(5) })], NOW);
    expect(out.map((e) => e.id)).toEqual(["fresh"]);
  });
});

describe("topByConfidence — uncapped storage, top-k retrieval", () => {
  it("returns only the namespace's active lessons, strongest (decayed) first, capped at k", () => {
    const entries = [
      entry({ id: "s1", namespace: "script", confidence: 0.3 }),
      entry({ id: "s2", namespace: "script", confidence: 0.9 }),
      entry({ id: "v1", namespace: "visual", confidence: 0.99 }),
    ];
    expect(topByConfidence(entries, "script", NOW, 5).map((e) => e.id)).toEqual(["s2", "s1"]);
  });

  it("floats pinned lessons to the top regardless of raw confidence", () => {
    const entries = [
      entry({ id: "hi", confidence: 0.95 }),
      entry({ id: "pinned", confidence: 0.2, pinned: true }),
    ];
    expect(topByConfidence(entries, "script", NOW, 2)[0].id).toBe("pinned");
  });

  it("excludes shadow lessons unless asked", () => {
    const entries = [entry({ id: "act" }), entry({ id: "shad", status: "shadow" })];
    expect(topByConfidence(entries, "script", NOW, 5).map((e) => e.id)).toEqual(["act"]);
    expect(topByConfidence(entries, "script", NOW, 5, true).map((e) => e.id).sort()).toEqual(["act", "shad"]);
  });

  it("ranks a fresh weaker lesson above an old stronger one once decay bites", () => {
    const entries = [
      entry({ id: "old", confidence: 0.9, lastConfirmedAt: daysAgo(4 * DECAY_HALFLIFE_DAYS) }), // ~0.056
      entry({ id: "fresh", confidence: 0.3, lastConfirmedAt: NOW }),
    ];
    expect(topByConfidence(entries, "script", NOW, 2).map((e) => e.id)).toEqual(["fresh", "old"]);
  });
});

describe("enforceSafetyCap — pathological-growth backstop only", () => {
  it("keeps the strongest N and always retains pinned entries", () => {
    const many: MemoryEntry[] = Array.from({ length: 10 }, (_, i) => entry({ id: `n${i}`, confidence: i / 10 }));
    many.push(entry({ id: "pin", confidence: 0.01, pinned: true }));
    const out = enforceSafetyCap(many, NOW, 3);
    expect(out.some((e) => e.id === "pin")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(4); // 3 strongest + the pinned one
  });

  it("is a no-op below the cap", () => {
    const few = [entry({ id: "a" }), entry({ id: "b" })];
    expect(enforceSafetyCap(few, NOW, 100)).toHaveLength(2);
  });
});

describe("recurringIssues", () => {
  it("buckets by criterion prefix and keeps those at/over the threshold", () => {
    const issues = ["Hook: weak open", "Hook: slow start", "Claim hygiene: unsourced stat", "Beat economy: filler"];
    const out = recurringIssues(issues, 2);
    expect(out).toHaveLength(1);
    expect(out[0].text.startsWith("Hook")).toBe(true);
    expect(out[0].count).toBe(2);
  });
});

// Type-level guard: the playbook stages remain a subset of memory namespaces.
const _ns: MemoryNamespace[] = ["quality", "idea", "script", "visual", "audio", "editing", "packaging", "competitive", "outcome"];
void _ns;
