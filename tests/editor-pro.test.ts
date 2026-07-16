/**
 * Editor & Assembly R4 — the pure pro-editor utilities (undo/redo history,
 * retime snapping, frame transport). The editor wires these behind the
 * editor.proEditor flag; the invariants live here.
 */
import { describe, expect, it } from "vitest";
import {
  initHistory,
  setPresent,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  snapSec,
  snapTargets,
  snapRetime,
  frameStep,
} from "@/lib/editor-pro";
import type { EditDocument } from "@studio/core";

describe("history (undo/redo)", () => {
  it("push records the present and clears redo; undo/redo round-trip", () => {
    let h = initHistory("a");
    expect(canUndo(h)).toBe(false);
    h = pushHistory(h, "b");
    h = pushHistory(h, "c");
    expect(h.present).toBe("c");
    expect(canUndo(h)).toBe(true);
    h = undoHistory(h);
    expect(h.present).toBe("b");
    expect(canRedo(h)).toBe(true);
    h = undoHistory(h);
    expect(h.present).toBe("a");
    expect(canUndo(h)).toBe(false);
    h = redoHistory(h);
    expect(h.present).toBe("b");
  });

  it("a new push after undo clears the redo branch", () => {
    let h = initHistory(1);
    h = pushHistory(h, 2);
    h = undoHistory(h); // present 1, future [2]
    h = pushHistory(h, 3); // clears future
    expect(h.present).toBe(3);
    expect(canRedo(h)).toBe(false);
  });

  it("setPresent replaces without recording history (flag-off path)", () => {
    let h = initHistory("a");
    h = setPresent(h, "b");
    expect(h.present).toBe("b");
    expect(canUndo(h)).toBe(false);
  });

  it("undo/redo on empty stacks are no-ops", () => {
    const h = initHistory("a");
    expect(undoHistory(h)).toEqual(h);
    expect(redoHistory(h)).toEqual(h);
  });
});

describe("snapSec", () => {
  it("snaps to the nearest candidate within threshold, else returns t", () => {
    expect(snapSec(4.94, [5, 10], 0.2)).toBe(5);
    expect(snapSec(4.5, [5, 10], 0.2)).toBe(4.5); // outside threshold
    expect(snapSec(7.6, [5, 10, 7.5], 0.2)).toBe(7.5);
  });
});

const doc = (): EditDocument => ({
  meta: { schemaVersion: 1, format: "long", fps: 30, aspect: "16:9", targetDurationSec: 30 },
  intro: { sting: true, sec: 2 },
  outro: { endCard: true, sec: 3 },
  tracks: {
    video: [
      { id: "v1", beatIdx: 0, assetId: null, source: "still", start: 2, duration: 6, trim: { in: 0, out: 6 }, motion: { kind: "none" }, transitionOut: { kind: "cut" }, silent: true },
      { id: "v2", beatIdx: 1, assetId: null, source: "still", start: 8, duration: 5, trim: { in: 0, out: 5 }, motion: { kind: "none" }, transitionOut: { kind: "cut" }, silent: true },
    ],
    audio: [],
    captions: [],
    overlays: [],
  },
});

describe("snapTargets + snapRetime", () => {
  it("includes clip boundaries and second ticks", () => {
    const t = snapTargets(doc());
    expect(t).toContain(2); // intro end / v1 start
    expect(t).toContain(8); // v1 end / v2 start
    expect(t).toContain(13); // v2 end
  });

  it("snaps a dragged clip end to a nearby boundary", () => {
    // v1 starts at 2; dragging its end near 8 (v2 start) should snap to 6s dur.
    expect(snapRetime(doc(), 2, 5.9)).toBeCloseTo(6, 5);
    // far from any target → unchanged
    expect(snapRetime(doc(), 2, 3.4)).toBeCloseTo(3.4, 5);
  });
});

describe("frameStep", () => {
  it("steps by frames and clamps at 0", () => {
    expect(frameStep(1, 1, 30)).toBeCloseTo(1 + 1 / 30, 5);
    expect(frameStep(0, -5, 30)).toBe(0);
  });
});
