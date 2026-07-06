/**
 * UI v2 Library classification (Phase 1) — the pure mapping from a video's
 * DB state to its library section, rail step, progress, and badges. Table-
 * driven over EVERY status so a new pipeline status can't silently fall out
 * of the library.
 */
import { describe, expect, it } from "vitest";
import { VIDEO_STATUSES, ON_APPROVE, type VideoStatus } from "@studio/core";
import {
  LIBRARY_SECTIONS,
  RAIL_STEPS,
  librarySectionFor,
  railIndexFor,
  tileState,
} from "@/lib/db/library";

type Fixture = {
  youtube_video_id: string | null;
  published_at: string | null;
  paused_reason: string | null;
  publish_requested: boolean;
  auto_publish: boolean;
  scheduled_publish_at: string | null;
  auto_pilot_run: boolean;
  build_run_id: string | null;
  auto_finish: boolean;
  total_cost_usd: number;
};

const base: Fixture = {
  youtube_video_id: null,
  published_at: null,
  paused_reason: null,
  publish_requested: false,
  auto_publish: false,
  scheduled_publish_at: null,
  auto_pilot_run: false,
  build_run_id: null,
  auto_finish: false,
  total_cost_usd: 0,
};

const v = (status: VideoStatus, extra: Partial<Fixture> = {}) =>
  ({ ...base, status, ...extra }) as never;

describe("librarySectionFor covers every status exactly once", () => {
  const EXPECTED: Record<VideoStatus, string | null> = {
    IDEA: "ideas",
    IDEA_APPROVED: "ideas",
    SCRIPTING: "script",
    SCRIPT_READY: "script",
    NEEDS_REVISION: "script",
    GENERATING_ASSETS: "production",
    ASSETS_READY: "production",
    ASSEMBLING: "production",
    FINAL_REVIEW: "production",
    APPROVED: "ready",
    TRACKING: "published",
    KILLED: null,
  };

  for (const status of VIDEO_STATUSES) {
    it(`${status} → ${EXPECTED[status] ?? "excluded"}`, () => {
      expect(librarySectionFor(v(status))).toBe(EXPECTED[status]);
    });
  }

  it("every mapped section is a real library section", () => {
    const keys = new Set(LIBRARY_SECTIONS.map((s) => s.key));
    for (const status of VIDEO_STATUSES) {
      const section = librarySectionFor(v(status));
      if (section != null) expect(keys.has(section)).toBe(true);
    }
  });

  it("a published video with a lagging status still reads Published", () => {
    expect(librarySectionFor(v("ASSEMBLING", { youtube_video_id: "yt1" }))).toBe(
      "published",
    );
  });
});

describe("rail progress", () => {
  it("never decreases along the canonical status order", () => {
    // VIDEO_STATUSES lists the main lane in pipeline order (off-lane
    // NEEDS_REVISION / KILLED excluded here).
    const lane = VIDEO_STATUSES.filter(
      (s) => s !== "NEEDS_REVISION" && s !== "KILLED",
    );
    let prev = -1;
    for (const status of lane) {
      const idx = railIndexFor(v(status));
      expect(idx, `${status} moved backwards on the rail`).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
    expect(railIndexFor(v("TRACKING"))).toBe(RAIL_STEPS.length - 1);
  });

  it("every approve transition moves forward or stays on the rail", () => {
    for (const [from, to] of Object.entries(ON_APPROVE) as [VideoStatus, VideoStatus][]) {
      expect(
        railIndexFor(v(to)),
        `${from} → ${to} went backwards`,
      ).toBeGreaterThanOrEqual(railIndexFor(v(from)));
    }
  });

  it("killed videos are off the rail", () => {
    expect(railIndexFor(v("KILLED"))).toBe(-1);
    expect(tileState(v("KILLED")).progressPercent).toBe(0);
  });
});

describe("tile badges", () => {
  it("open gates await the operator", () => {
    for (const status of ["IDEA", "SCRIPT_READY", "ASSETS_READY", "FINAL_REVIEW"] as VideoStatus[]) {
      expect(tileState(v(status)).awaitingYou, status).toBe(true);
    }
  });

  it("running stages do not await the operator", () => {
    for (const status of ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING", "TRACKING"] as VideoStatus[]) {
      expect(tileState(v(status)).awaitingYou, status).toBe(false);
    }
  });

  it("a paused_reason surfaces as awaiting-you; 'failed' only on failures", () => {
    const paused = tileState(v("ASSEMBLING", { paused_reason: "Global kill switch is on" }));
    expect(paused.awaitingYou).toBe(true);
    expect(paused.failed).toBe(false);

    const failed = tileState(v("ASSEMBLING", { paused_reason: "Render failed ×3 — see log" }));
    expect(failed.awaitingYou).toBe(true);
    expect(failed.failed).toBe(true);
  });

  it("APPROVED not queued for upload awaits the operator; queued/scheduled do not", () => {
    expect(tileState(v("APPROVED")).awaitingYou).toBe(true);
    expect(tileState(v("APPROVED", { publish_requested: true })).awaitingYou).toBe(false);
    expect(
      tileState(v("APPROVED", { scheduled_publish_at: "2027-01-01T00:00:00Z" })).awaitingYou,
    ).toBe(false);
  });

  it("autopilot ownership from any autonomous marker", () => {
    expect(tileState(v("SCRIPTING", { auto_pilot_run: true })).autopilot).toBe(true);
    expect(tileState(v("SCRIPTING", { build_run_id: "b1" })).autopilot).toBe(true);
    expect(tileState(v("SCRIPTING", { auto_finish: true })).autopilot).toBe(true);
    expect(tileState(v("SCRIPTING")).autopilot).toBe(false);
  });

  it("a published video with a stale paused_reason is not flagged", () => {
    expect(
      tileState(v("TRACKING", { paused_reason: "old render retry note", youtube_video_id: "yt" }))
        .awaitingYou,
    ).toBe(false);
  });
});
