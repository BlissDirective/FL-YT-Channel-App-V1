/**
 * Director Mode polish — the Autopilot nav tab is hidden for director projects
 * (the page also redirects as a backstop). projectNavV2 is pure, so assert the
 * filtering directly for both modes.
 */
import { describe, expect, it } from "vitest";
import { projectNavV2 } from "@/components/shell/nav-context";

const labels = (mode?: string) => projectNavV2("p1", mode).map((i) => i.label);

describe("projectNavV2 mode filtering", () => {
  it("autonomous (default) shows the Autopilot tab", () => {
    expect(labels()).toContain("Autopilot");
    expect(labels("autonomous")).toContain("Autopilot");
  });

  it("director hides the Autopilot tab, keeps the rest", () => {
    const l = labels("director");
    expect(l).not.toContain("Autopilot");
    expect(l).toEqual(["Library", "Feed", "Settings"]);
  });
});
