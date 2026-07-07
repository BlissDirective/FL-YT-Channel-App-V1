/**
 * v2 — the unified runs read model (src/lib/pipeline/runs.ts): one seam over
 * operator_runs + build_runs for every run-listing consumer (Autopilot
 * timeline, Feed). Tested against the fake query-builder.
 */
import { describe, expect, it } from "vitest";
import { fakeDb } from "./helpers/fake-db";
import { boostRunLabel, getStudioRuns, operatorRunLabel } from "@/lib/pipeline/runs";

describe("getStudioRuns", () => {
  it("interleaves boost + operator runs newest-first with human labels", async () => {
    const db = fakeDb({
      build_runs: [
        { id: "b1", project_id: "p1", status: "publishing", count: 3, created_at: "2026-07-06T10:00:00Z" },
        { id: "b2", project_id: "p1", status: "done", count: 1, created_at: "2026-07-04T10:00:00Z" },
        { id: "bx", project_id: "OTHER", status: "done", count: 9, created_at: "2026-07-07T10:00:00Z" },
      ],
      operator_runs: [
        { id: "o1", project_id: "p1", status: "active", created_at: "2026-07-05T10:00:00Z" },
      ],
    });
    const runs = await getStudioRuns("p1", 10, db as never);
    expect(runs.map((r) => r.id)).toEqual(["b1", "o1", "b2"]); // sorted, scoped
    expect(runs[0]).toMatchObject({
      source: "boost",
      videoCount: 3,
      label: "Boost run — 3 videos (publishing)",
    });
    expect(runs[1]).toMatchObject({
      source: "operator",
      videoCount: null,
      label: "Autopilot cycle active",
    });
  });

  it("respects the limit across both sources", async () => {
    const db = fakeDb({
      build_runs: [1, 2, 3].map((i) => ({
        id: `b${i}`, project_id: "p1", status: "done", count: 1, created_at: `2026-07-0${i}T10:00:00Z`,
      })),
      operator_runs: [4, 5].map((i) => ({
        id: `o${i}`, project_id: "p1", status: "ended", created_at: `2026-07-0${i}T10:00:00Z`,
      })),
    });
    const runs = await getStudioRuns("p1", 3, db as never);
    expect(runs).toHaveLength(3);
    expect(runs[0].id).toBe("o5"); // newest overall wins
  });
});

describe("labels", () => {
  it("singular/plural boost labels", () => {
    expect(boostRunLabel(1, "queued")).toBe("Boost run — 1 video (queued)");
    expect(boostRunLabel(4, "held")).toBe("Boost run — 4 videos (held)");
  });
  it("operator cycle label", () => {
    expect(operatorRunLabel("paused")).toBe("Autopilot cycle paused");
  });
});
