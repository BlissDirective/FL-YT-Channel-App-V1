/**
 * Visual-grounding frame selection (Precision-Editing spec §C.1). Pure picks of
 * which clips to render stills for, at decision points, capped.
 */
import { describe, expect, it } from "vitest";
import { selectGroundingFrames, type GroundingClip } from "@studio/core";

function clips(n: number, transitions: Record<number, string> = {}): GroundingClip[] {
  const out: GroundingClip[] = [];
  let start = 0;
  for (let i = 0; i < n; i++) {
    const duration = 2;
    out.push({ id: `c${i}`, beatIdx: i, start, duration, transitionOut: { kind: transitions[i] ?? "cut" } });
    start += duration;
  }
  return out;
}

describe("selectGroundingFrames", () => {
  it("returns nothing for an empty timeline", () => {
    expect(selectGroundingFrames([], 6)).toEqual([]);
  });

  it("samples every clip when under the cap, sorted, at midpoints", () => {
    const r = selectGroundingFrames(clips(3), 6);
    expect(r.map((f) => f.clipId)).toEqual(["c0", "c1", "c2"]);
    expect(r[0].atSec).toBe(1); // start 0 + dur/2
    expect(r[1].atSec).toBe(3);
  });

  it("caps at maxFrames and always keeps the bookends", () => {
    const r = selectGroundingFrames(clips(20), 6);
    expect(r.length).toBe(6);
    expect(r[0].clipId).toBe("c0");
    expect(r[r.length - 1].clipId).toBe("c19");
  });

  it("prioritizes real transitions (decision points) over even fill", () => {
    // 20 clips, cut everywhere except clip 7 (whip) and clip 13 (dissolve).
    const r = selectGroundingFrames(clips(20, { 7: "whip", 13: "dissolve" }), 6);
    const ids = r.map((f) => f.clipId);
    expect(ids).toContain("c7");
    expect(ids).toContain("c13");
    expect(ids).toContain("c0");
    expect(ids).toContain("c19");
    expect(r.length).toBe(6);
  });

  it("is deterministic and sorted by timeline position", () => {
    const a = selectGroundingFrames(clips(15, { 4: "slide" }), 5);
    const b = selectGroundingFrames(clips(15, { 4: "slide" }), 5);
    expect(a).toEqual(b);
    const secs = a.map((f) => f.atSec);
    expect([...secs].sort((x, y) => x - y)).toEqual(secs);
  });
});
