/**
 * playbook.ts — the evidence-gated memory governance core (Harness C4). The
 * write policy (evidence required), reinforcement, expiry, cap, and
 * stage-relevant retrieval are all pure and safety-critical for the learning
 * loop, so they're exercised directly.
 */
import { describe, expect, it } from "vitest";
import {
  capEntries,
  curate,
  expireStale,
  recurringIssues,
  retrieveForStage,
  upsertLesson,
  type PlaybookEntry,
} from "@/lib/pipeline/playbook";

const NOW = "2026-07-03T00:00:00.000Z";
const daysAgo = (n: number) => new Date(new Date(NOW).getTime() - n * 86_400_000).toISOString();

const entry = (over: Partial<PlaybookEntry> = {}): PlaybookEntry => ({
  id: over.id ?? "e",
  stage: over.stage ?? "script",
  text: over.text ?? "Tighten the hook",
  confidence: over.confidence ?? 0.4,
  evidence: over.evidence ?? "autofix +1.0 QC",
  evidenceCount: over.evidenceCount ?? 1,
  createdAt: over.createdAt ?? NOW,
  lastConfirmedAt: over.lastConfirmedAt ?? NOW,
});

describe("upsertLesson — write policy", () => {
  it("refuses a lesson with no evidence", () => {
    const out = upsertLesson([], { stage: "script", text: "Do a thing", evidence: "" }, NOW, "id1");
    expect(out).toHaveLength(0);
  });

  it("adds a new evidence-backed lesson", () => {
    const out = upsertLesson([], { stage: "script", text: "Open on the payoff", evidence: "retention +6%" }, NOW, "id1");
    expect(out).toHaveLength(1);
    expect(out[0].evidenceCount).toBe(1);
  });

  it("reinforces a matching lesson instead of duplicating (confidence rises, count bumps)", () => {
    const start = [entry({ text: "Open the video on the payoff promise", confidence: 0.4 })];
    const out = upsertLesson(
      start,
      { stage: "script", text: "Open on the payoff promise immediately", evidence: "retention +4%" },
      NOW,
      "id2",
    );
    expect(out).toHaveLength(1);
    expect(out[0].evidenceCount).toBe(2);
    expect(out[0].confidence).toBeGreaterThan(0.4);
    expect(out[0].confidence).toBeLessThanOrEqual(1);
  });

  it("keeps lessons in different stages separate even with similar text", () => {
    const start = [entry({ stage: "script", text: "Vary the shots" })];
    const out = upsertLesson(start, { stage: "visual", text: "Vary the shots", evidence: "autofix +0.8" }, NOW, "id3");
    expect(out).toHaveLength(2);
  });
});

describe("expireStale", () => {
  it("drops bullets unconfirmed beyond the window, keeps fresh ones", () => {
    const out = expireStale([entry({ id: "old", lastConfirmedAt: daysAgo(120) }), entry({ id: "new", lastConfirmedAt: daysAgo(10) })], NOW);
    expect(out.map((e) => e.id)).toEqual(["new"]);
  });
});

describe("capEntries", () => {
  it("keeps the strongest by confidence then evidence count", () => {
    const out = capEntries(
      [entry({ id: "a", confidence: 0.2 }), entry({ id: "b", confidence: 0.9 }), entry({ id: "c", confidence: 0.5 })],
      2,
    );
    expect(out.map((e) => e.id)).toEqual(["b", "c"]);
  });
});

describe("curate — full hygiene pass", () => {
  it("upserts, expires stale, and caps in one call", () => {
    const start = [entry({ id: "stale", lastConfirmedAt: daysAgo(200) })];
    const out = curate(start, { stage: "script", text: "New evidence-backed lesson", evidence: "flagged 4x" }, NOW, "fresh");
    expect(out.find((e) => e.id === "stale")).toBeUndefined();
    expect(out.find((e) => e.text.includes("New evidence"))).toBeDefined();
  });
});

describe("retrieveForStage", () => {
  it("returns only the stage's lessons, most confident first, capped", () => {
    const entries = [
      entry({ stage: "script", text: "S1", confidence: 0.3 }),
      entry({ stage: "script", text: "S2", confidence: 0.9 }),
      entry({ stage: "visual", text: "V1", confidence: 0.99 }),
    ];
    expect(retrieveForStage(entries, "script", 5)).toEqual(["S2", "S1"]);
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
