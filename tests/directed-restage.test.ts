import { describe, expect, it } from "vitest";
import { cutIsStale, type RestageInput } from "../packages/clips/src/directed-restage";

const base: RestageInput = {
  directed: true,
  status: "ASSEMBLING",
  openJobs: 0,
  latestCutAt: "2026-09-29T20:54:12.300Z",
  latestClipAt: "2026-09-29T20:58:30.000Z",
};

describe("cutIsStale", () => {
  it("re-stages a cut compiled before the clip that landed after it", () => {
    expect(cutIsStale(base)).toBe(true);
    expect(cutIsStale({ ...base, status: "FINAL_REVIEW" })).toBe(true);
  });

  it("leaves a cut compiled after every clip alone", () => {
    expect(cutIsStale({ ...base, latestCutAt: "2026-09-29T20:59:00.000Z" })).toBe(false);
  });

  it("waits while clips are still pending", () => {
    expect(cutIsStale({ ...base, openJobs: 1 })).toBe(false);
  });

  it("ignores videos still at the asset stage and non-directed videos", () => {
    expect(cutIsStale({ ...base, status: "ASSETS_READY" })).toBe(false);
    expect(cutIsStale({ ...base, status: "PUBLISHED" })).toBe(false);
    expect(cutIsStale({ ...base, directed: false })).toBe(false);
  });

  it("compiles when there is no cut yet, never when there is no clip", () => {
    expect(cutIsStale({ ...base, latestCutAt: null })).toBe(true);
    expect(cutIsStale({ ...base, latestClipAt: null })).toBe(false);
  });
});
