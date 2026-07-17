/**
 * Library "working" tile live progress (#3). The pure label/fraction logic —
 * asset generation shows a real N/M clip fraction, other worker stages show a
 * descriptive label, and non-processing statuses show nothing.
 */
import { describe, expect, it } from "vitest";
import { liveProgress } from "@/lib/db/library";

describe("liveProgress", () => {
  it("gives a clip fraction for asset generation", () => {
    expect(liveProgress("GENERATING_ASSETS", 3, 8)).toEqual({
      label: "Generating 3/8 clips",
      done: 3,
      total: 8,
    });
  });

  it("caps done at total (a late-arriving asset can't exceed the beat count)", () => {
    expect(liveProgress("GENERATING_ASSETS", 10, 8)).toEqual({
      label: "Generating 8/8 clips",
      done: 8,
      total: 8,
    });
  });

  it("falls back to a plain label when the beat count is unknown", () => {
    expect(liveProgress("GENERATING_ASSETS", 2, undefined)).toEqual({ label: "Generating assets…" });
    expect(liveProgress("GENERATING_ASSETS", 2, 0)).toEqual({ label: "Generating assets…" });
  });

  it("labels the other worker stages", () => {
    expect(liveProgress("SCRIPTING", 0, undefined)?.label).toBe("Writing script…");
    expect(liveProgress("ASSEMBLING", 0, undefined)?.label).toBe("Rendering…");
    expect(liveProgress("NEEDS_REVISION", 0, undefined)?.label).toBe("Revising…");
  });

  it("returns null for non-processing statuses", () => {
    expect(liveProgress("APPROVED", 0, undefined)).toBeNull();
    expect(liveProgress("TRACKING", 0, undefined)).toBeNull();
    expect(liveProgress("SCRIPT_READY", 0, undefined)).toBeNull();
  });
});
