import { describe, expect, it } from "vitest";
import {
  APPROVAL_GATES,
  GATE_FOR_STATUS,
  GATE_LABELS,
  ON_APPROVE,
  PIPELINE_STAGES,
  PREVIOUS_STAGE,
  REVISION_TARGET,
  VIDEO_STATUSES,
  canStepBack,
  type ApprovalGate,
  type VideoStatus,
} from "@studio/core";

const order = (s: VideoStatus) => VIDEO_STATUSES.indexOf(s);

describe("state machine maps are internally consistent", () => {
  it("GATE_FOR_STATUS keys are valid statuses and values are valid gates", () => {
    for (const [status, gate] of Object.entries(GATE_FOR_STATUS)) {
      expect(VIDEO_STATUSES).toContain(status);
      expect(APPROVAL_GATES).toContain(gate);
    }
  });

  it("every gate is reachable from exactly one status", () => {
    const gates = Object.values(GATE_FOR_STATUS);
    expect(gates.sort()).toEqual([...APPROVAL_GATES].sort());
    expect(new Set(gates).size).toBe(gates.length);
  });

  it("ON_APPROVE covers exactly the gated statuses and targets valid statuses", () => {
    expect(Object.keys(ON_APPROVE).sort()).toEqual(Object.keys(GATE_FOR_STATUS).sort());
    for (const target of Object.values(ON_APPROVE)) {
      expect(VIDEO_STATUSES).toContain(target);
    }
  });

  it("REVISION_TARGET maps every gate to a valid status", () => {
    for (const gate of APPROVAL_GATES) {
      expect(VIDEO_STATUSES).toContain(REVISION_TARGET[gate]);
    }
  });

  it("PREVIOUS_STAGE keys and values are valid statuses", () => {
    for (const [from, to] of Object.entries(PREVIOUS_STAGE)) {
      expect(VIDEO_STATUSES).toContain(from);
      expect(VIDEO_STATUSES).toContain(to);
    }
  });
});

describe("approval transitions", () => {
  it("approving each gated status advances to the expected next status", () => {
    expect(ON_APPROVE.IDEA).toBe("IDEA_APPROVED");
    expect(ON_APPROVE.SCRIPT_READY).toBe("GENERATING_ASSETS");
    expect(ON_APPROVE.ASSETS_READY).toBe("ASSEMBLING");
    expect(ON_APPROVE.FINAL_REVIEW).toBe("APPROVED");
  });

  it("approval always moves strictly forward in pipeline order", () => {
    for (const [from, to] of Object.entries(ON_APPROVE) as [VideoStatus, VideoStatus][]) {
      expect(order(to)).toBeGreaterThan(order(from));
    }
  });

  it("no status is its own approve-target", () => {
    for (const [from, to] of Object.entries(ON_APPROVE)) {
      expect(to).not.toBe(from);
    }
  });
});

describe("revision targets", () => {
  it("never land after the gate they revise (re-run at or before the gate)", () => {
    const statusForGate = Object.fromEntries(
      Object.entries(GATE_FOR_STATUS).map(([status, gate]) => [gate, status]),
    ) as Record<ApprovalGate, VideoStatus>;
    for (const gate of APPROVAL_GATES) {
      expect(order(REVISION_TARGET[gate])).toBeLessThanOrEqual(order(statusForGate[gate]));
    }
    // Every gate after IDEA re-runs the *producing* stage strictly before it.
    for (const gate of APPROVAL_GATES.filter((g) => g !== "IDEA")) {
      expect(order(REVISION_TARGET[gate])).toBeLessThan(order(statusForGate[gate]));
    }
    // IDEA has no earlier stage: revision regenerates the idea itself.
    expect(REVISION_TARGET.IDEA).toBe("IDEA");
  });
});

describe("step-back transitions", () => {
  it("always move strictly backward and land on a reviewable status", () => {
    const reviewable = new Set(Object.keys(GATE_FOR_STATUS));
    for (const [from, to] of Object.entries(PREVIOUS_STAGE) as [VideoStatus, VideoStatus][]) {
      expect(order(to)).toBeLessThan(order(from));
      expect(reviewable.has(to)).toBe(true);
    }
  });

  it("canStepBack matches the PREVIOUS_STAGE keys", () => {
    for (const status of Object.keys(PREVIOUS_STAGE) as VideoStatus[]) {
      expect(canStepBack(status)).toBe(true);
    }
    expect(canStepBack("IDEA")).toBe(false);
    expect(canStepBack("KILLED")).toBe(false);
    expect(canStepBack("TRACKING")).toBe(false);
  });
});

describe("labels and stages", () => {
  it("every gate has a non-empty human label", () => {
    for (const gate of APPROVAL_GATES) {
      expect(GATE_LABELS[gate]).toBeTruthy();
      expect(GATE_LABELS[gate].trim().length).toBeGreaterThan(0);
    }
  });

  it("PIPELINE_STAGES cover every status except the terminal/exception ones", () => {
    const shown = PIPELINE_STAGES.flatMap((s) => s.statuses as readonly string[]);
    expect(new Set(shown).size).toBe(shown.length); // no status in two stages
    const missing = VIDEO_STATUSES.filter((s) => !shown.includes(s));
    expect(missing.sort()).toEqual(["KILLED", "NEEDS_REVISION"]);
  });
});
