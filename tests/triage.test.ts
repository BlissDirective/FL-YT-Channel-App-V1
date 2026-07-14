/**
 * Feed triage bucketing (rapid asset processing). The pure `triageBucket`
 * decides which bucket an actionable asset lands in, per mode. Autonomous only
 * surfaces gate arrivals / holds / ready / failed (the engine drives the rest);
 * Director surfaces every non-terminal asset since the operator drives each.
 */
import { describe, expect, it } from "vitest";
import { triageBucket } from "@/lib/db/triage";

type Tile = {
  section: "ideas" | "script" | "production" | "ready" | "published" | null;
  awaitingYou: boolean;
  failed: boolean;
};

const item = (
  status: string,
  tile: Partial<Tile> & { section: Tile["section"] },
  gateLabel: string | null = null,
) => ({
  video: { status },
  gateLabel,
  tile: { awaitingYou: false, failed: false, ...tile } as Tile,
});

describe("triageBucket — autonomous", () => {
  const M = "autonomous" as const;
  it("gate arrival → approve", () => {
    expect(triageBucket(item("SCRIPT_READY", { section: "script", awaitingYou: true }, "Script gate"), M)).toBe("approve");
  });
  it("held (paused, no gate) → held", () => {
    expect(triageBucket(item("FINAL_REVIEW", { section: "production", awaitingYou: true }), M)).toBe("held");
  });
  it("ready → ready", () => {
    expect(triageBucket(item("APPROVED", { section: "ready", awaitingYou: true }), M)).toBe("ready");
  });
  it("failed → failed", () => {
    expect(triageBucket(item("FINAL_REVIEW", { section: "production", awaitingYou: true, failed: true }), M)).toBe("failed");
  });
  it("mid-work with no gate (engine driving) → not surfaced", () => {
    expect(triageBucket(item("GENERATING_ASSETS", { section: "production", awaitingYou: false }), M)).toBeNull();
  });
  it("terminal (tracking/killed) → not surfaced", () => {
    expect(triageBucket(item("TRACKING", { section: "published" }), M)).toBeNull();
    expect(triageBucket(item("KILLED", { section: null }), M)).toBeNull();
  });
});

describe("triageBucket — director", () => {
  const M = "director" as const;
  it("gate → approve (ready to advance)", () => {
    expect(triageBucket(item("SCRIPT_READY", { section: "script", awaitingYou: true }, "Script gate"), M)).toBe("approve");
  });
  it("working stage (no gate) → approve (needs Generate)", () => {
    expect(triageBucket(item("GENERATING_ASSETS", { section: "production", awaitingYou: true }), M)).toBe("approve");
  });
  it("held at a non-working status (no gate) → held", () => {
    expect(triageBucket(item("FINAL_REVIEW", { section: "production", awaitingYou: true }), M)).toBe("held");
  });
  it("approved → ready", () => {
    expect(triageBucket(item("APPROVED", { section: "ready", awaitingYou: true }), M)).toBe("ready");
  });
  it("failed → failed", () => {
    expect(triageBucket(item("ASSEMBLING", { section: "production", awaitingYou: true, failed: true }), M)).toBe("failed");
  });
  it("terminal → not surfaced", () => {
    expect(triageBucket(item("TRACKING", { section: "published" }), M)).toBeNull();
    expect(triageBucket(item("KILLED", { section: null }), M)).toBeNull();
  });
});
