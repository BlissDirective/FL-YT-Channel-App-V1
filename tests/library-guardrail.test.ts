/**
 * Library-size guardrail + archive counting (Clean House §5). Pure: which
 * assets occupy a working-library slot, and when the guardrail trips.
 */
import { describe, expect, it } from "vitest";
import { activeLibraryCount, countsTowardLibraryLimit, isOverLibraryLimit } from "@/lib/db/library";

const v = (over: Partial<Parameters<typeof countsTowardLibraryLimit>[0]> = {}) => ({
  status: "SCRIPTING" as const,
  youtube_video_id: null,
  published_at: null,
  archived: false,
  ...over,
});

describe("countsTowardLibraryLimit", () => {
  it("counts a working-pipeline asset (Ideas → Ready)", () => {
    expect(countsTowardLibraryLimit(v({ status: "SCRIPTING" }))).toBe(true);
    expect(countsTowardLibraryLimit(v({ status: "APPROVED" }))).toBe(true); // Ready-but-not-archived still counts
  });
  it("excludes killed, archived, and published/tracking", () => {
    expect(countsTowardLibraryLimit(v({ status: "KILLED" }))).toBe(false);
    expect(countsTowardLibraryLimit(v({ archived: true }))).toBe(false);
    expect(countsTowardLibraryLimit(v({ status: "TRACKING" }))).toBe(false);
    expect(countsTowardLibraryLimit(v({ youtube_video_id: "yt1" }))).toBe(false); // live
    expect(countsTowardLibraryLimit(v({ published_at: "2026-01-01" }))).toBe(false);
  });
});

describe("activeLibraryCount + isOverLibraryLimit", () => {
  it("counts only working assets", () => {
    const vids = [
      v({ status: "SCRIPTING" }),
      v({ status: "APPROVED" }),
      v({ status: "TRACKING" }), // published — free slot
      v({ archived: true }), // archived — free slot
      v({ status: "KILLED" }),
    ];
    expect(activeLibraryCount(vids)).toBe(2);
  });
  it("trips at or over the limit; 0 disables it", () => {
    expect(isOverLibraryLimit(5, 5)).toBe(true);
    expect(isOverLibraryLimit(4, 5)).toBe(false);
    expect(isOverLibraryLimit(9, 0)).toBe(false); // disabled
  });
});
