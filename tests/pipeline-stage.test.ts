/**
 * db/pipeline.ts — stage classification. Regression guard for the reported
 * bug: the flow-diagram badge count ("Ready = 6") must equal the set of
 * videos the review page shows for that stage. Both now derive from
 * effectiveStageKey, so this pins that they can't drift.
 */
import { describe, expect, it } from "vitest";
import { effectiveStageKey, isLive, stageCounts } from "@/lib/db/pipeline";
import type { Video } from "@/lib/db/types";

const v = (over: Partial<Video>): Video =>
  ({
    id: over.id ?? "v",
    status: over.status ?? "IDEA",
    youtube_video_id: over.youtube_video_id ?? null,
    published_at: over.published_at ?? null,
    ...over,
  }) as Video;

describe("isLive", () => {
  it("is true for uploaded, published, or tracking videos", () => {
    expect(isLive(v({ youtube_video_id: "abc" }))).toBe(true);
    expect(isLive(v({ published_at: "2026-07-01" }))).toBe(true);
    expect(isLive(v({ status: "TRACKING" }))).toBe(true);
    expect(isLive(v({ status: "APPROVED" }))).toBe(false);
  });
});

describe("effectiveStageKey", () => {
  it("maps each status to its stage", () => {
    expect(effectiveStageKey(v({ status: "IDEA" }))).toBe("ideas");
    expect(effectiveStageKey(v({ status: "SCRIPT_READY" }))).toBe("script");
    expect(effectiveStageKey(v({ status: "GENERATING_ASSETS" }))).toBe("assets");
    expect(effectiveStageKey(v({ status: "FINAL_REVIEW" }))).toBe("render");
    expect(effectiveStageKey(v({ status: "APPROVED" }))).toBe("ready");
    expect(effectiveStageKey(v({ status: "TRACKING" }))).toBe("ready");
  });

  it("puts a published video in Ready even if its status field lagged", () => {
    // The exact stall the guard prevents: uploaded but stuck at ASSEMBLING.
    expect(effectiveStageKey(v({ status: "ASSEMBLING", youtube_video_id: "yt1" }))).toBe("ready");
  });

  it("returns null for videos outside the pipeline lanes", () => {
    expect(effectiveStageKey(v({ status: "KILLED" }))).toBeNull();
    expect(effectiveStageKey(v({ status: "NEEDS_REVISION" }))).toBeNull();
  });
});

describe("stageCounts matches the classification", () => {
  it("the Ready count equals the number of videos the review page would list", () => {
    // Mirrors the reported scenario: 3 approved-unpublished + 3 live = Ready 6.
    const videos = [
      v({ id: "1", status: "APPROVED" }),
      v({ id: "2", status: "APPROVED" }),
      v({ id: "3", status: "APPROVED" }),
      v({ id: "4", status: "TRACKING" }),
      v({ id: "5", status: "APPROVED", youtube_video_id: "yt" }),
      v({ id: "6", status: "ASSEMBLING", published_at: "2026-07-01" }), // lagged-but-live
      v({ id: "7", status: "SCRIPT_READY" }), // different stage
    ];
    const counts = stageCounts(videos);
    const readyByClassification = videos.filter((x) => effectiveStageKey(x) === "ready").length;
    expect(counts.ready).toBe(6);
    expect(counts.ready).toBe(readyByClassification);
    expect(counts.script).toBe(1);
    expect(counts.render).toBe(0); // the lagged-but-live video is NOT counted at render
  });

  it("counts nothing for an all-killed set", () => {
    const counts = stageCounts([v({ status: "KILLED" }), v({ status: "NEEDS_REVISION" })]);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });
});
