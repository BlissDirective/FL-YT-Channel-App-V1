/**
 * memory.ts — the Studio Memory Service governance core (Harness C8). The write
 * policy (evidence-gated), reinforcement, confidence decay + revival, pin
 * exemption, outcome-floor retirement, and top-k retrieval are all pure and
 * safety-critical for the cross-agent learning loop, so they're exercised
 * directly. Supersedes the C4 playbook's hard 40-cap / 90-day-expiry tests.
 */
import { describe, expect, it } from "vitest";
import {
  craftNamespaceForChange,
  DECAY_HALFLIFE_DAYS,
  decayedConfidence,
  enforceSafetyCap,
  planGlobalPromotion,
  planGraduation,
  recurringIssues,
  retireStale,
  topByConfidence,
  upsertEntry,
  type ChannelLesson,
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

describe("planGraduation — shadow→graduate lifecycle", () => {
  const CFG = { shadowMinEvidence: 5, autoGraduateConfidence: 0.8 };
  it("promotes a shadow lesson that recurred enough and built confidence", () => {
    const e = entry({ id: "grad", status: "shadow", evidenceCount: 6, confidence: 0.85 });
    const { promote, retire } = planGraduation([e], CFG, NOW);
    expect(promote).toEqual(["grad"]);
    expect(retire).toHaveLength(0);
  });

  it("retires a shadow lesson that faded (decayed below floor, never recurred)", () => {
    const e = entry({ id: "fade", status: "shadow", evidenceCount: 1, confidence: 0.3, lastConfirmedAt: daysAgo(10 * DECAY_HALFLIFE_DAYS) });
    const { promote, retire } = planGraduation([e], CFG, NOW);
    expect(retire).toEqual(["fade"]);
    expect(promote).toHaveLength(0);
  });

  it("leaves a still-maturing shadow lesson alone (enough recurrence, not enough confidence)", () => {
    const e = entry({ id: "wait", status: "shadow", evidenceCount: 6, confidence: 0.5 });
    const { promote, retire } = planGraduation([e], CFG, NOW);
    expect(promote).toHaveLength(0);
    expect(retire).toHaveLength(0);
  });

  it("never promotes or retires active or pinned lessons", () => {
    const active = entry({ id: "act", status: "active", evidenceCount: 9, confidence: 0.95 });
    const pinned = entry({ id: "pin", status: "shadow", pinned: true, evidenceCount: 9, confidence: 0.95 });
    const { promote, retire } = planGraduation([active, pinned], CFG, NOW);
    expect(promote).toHaveLength(0);
    expect(retire).toHaveLength(0);
  });
});

describe("planGlobalPromotion — the librarian's ≥N-channel global-craft promotion", () => {
  const lesson = (namespace: MemoryNamespace, text: string, projectId: string): ChannelLesson => ({ namespace, text, projectId });

  it("promotes a technique lesson confirmed on ≥3 distinct channels", () => {
    const lessons = [
      lesson("visual", "Kinetic captions in two to three word windows lift retention", "c1"),
      lesson("visual", "Kinetic captions with 2-3 word windows improve retention", "c2"),
      lesson("visual", "Two or three word kinetic caption windows raise retention", "c3"),
    ];
    const out = planGlobalPromotion(lessons, [], 3);
    expect(out).toHaveLength(1);
    expect(out[0].namespace).toBe("visual");
    expect(out[0].channels).toBe(3);
  });

  it("does not promote a lesson seen on too few channels", () => {
    const lessons = [
      lesson("visual", "Cold open under three seconds", "c1"),
      lesson("visual", "Cold open under three seconds", "c2"),
    ];
    expect(planGlobalPromotion(lessons, [], 3)).toHaveLength(0);
  });

  it("counts distinct channels only (three lessons from one channel is not three channels)", () => {
    const lessons = [
      lesson("editing", "Cut on motion for smoother pacing", "c1"),
      lesson("editing", "Cut on motion for smoother pacing", "c1"),
      lesson("editing", "Cut on motion for smoother pacing", "c1"),
    ];
    expect(planGlobalPromotion(lessons, [], 3)).toHaveLength(0);
  });

  it("never promotes channel-only namespaces (ideas / competitor intel / winners)", () => {
    const lessons = [
      lesson("idea", "Do a video about X", "c1"),
      lesson("idea", "Do a video about X", "c2"),
      lesson("idea", "Do a video about X", "c3"),
      lesson("outcome", "Winner: X", "c1"),
      lesson("outcome", "Winner: X", "c2"),
      lesson("outcome", "Winner: X", "c3"),
    ];
    expect(planGlobalPromotion(lessons, [], 3)).toHaveLength(0);
  });

  it("skips a lesson that already exists in the global tier", () => {
    const lessons = [
      lesson("quality", "Ensure every beat has a visual", "c1"),
      lesson("quality", "Ensure every beat has a visual", "c2"),
      lesson("quality", "Ensure every beat has a visual", "c3"),
    ];
    const existingGlobal = [{ namespace: "quality" as MemoryNamespace, text: "Ensure every beat has a visual" }];
    expect(planGlobalPromotion(lessons, existingGlobal, 3)).toHaveLength(0);
  });
});

describe("craftNamespaceForChange", () => {
  it("routes audio-flavored changes to the audio namespace", () => {
    expect(craftNamespaceForChange("Re-recorded the voiceover to fix dead air")).toBe("audio");
    expect(craftNamespaceForChange("Raised loudness toward -14 LUFS")).toBe("audio");
  });
  it("routes edit-flavored changes to the editing namespace", () => {
    expect(craftNamespaceForChange("Tightened captions on beat 3")).toBe("editing");
    expect(craftNamespaceForChange("Reframed beat 2 (zoom out, re-centre)")).toBe("editing");
    expect(craftNamespaceForChange("Added a crossfade at the cut")).toBe("editing");
  });
  it("defaults visual re-rolls to the visual namespace", () => {
    expect(craftNamespaceForChange("Re-rolled visual for beat 1")).toBe("visual");
    expect(craftNamespaceForChange("Re-choreographed the scene for clarity")).toBe("editing"); // choreograph → editing
    expect(craftNamespaceForChange("Replaced the still with a fresh image")).toBe("visual");
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
