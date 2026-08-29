import { describe, expect, it } from "vitest";
import {
  MIX_MAX,
  MIX_MIN,
  AD_VIEWS_GOAL,
  AUDIENCE_GOAL,
  CONSIDERATION_HOURS_GOAL,
  desiredMixShortsPct,
  mixReason,
  nearerPath,
} from "@/lib/pipeline/monetization";
import type { OperatorStrategy } from "@/lib/db/types";

function stratWith(
  channel: Partial<NonNullable<OperatorStrategy["channel"]>>,
  extra?: Partial<OperatorStrategy>,
): OperatorStrategy {
  return {
    channel: {
      subs: 0,
      watchHours365: 0,
      views90: 0,
      subsGained90: 0,
      retentionPct: 0,
      ctr: 0,
      ...channel,
    },
    ...extra,
  };
}

describe("desiredMixShortsPct", () => {
  it("without a strategy, passes the base mix through clamped to [MIX_MIN, MIX_MAX]", () => {
    expect(desiredMixShortsPct(0.2)).toBe(MIX_MIN);
    expect(desiredMixShortsPct(0.99)).toBe(MIX_MAX);
    expect(desiredMixShortsPct(0.7)).toBe(0.7);
    expect(desiredMixShortsPct(0.7, {} as OperatorStrategy)).toBe(0.7); // strategy without channel
  });

  it("below the audience floor → variant-led 0.82 regardless of base mix", () => {
    const s = stratWith({ subs: AUDIENCE_GOAL - 1, watchHours365: 9999 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.82);
    expect(desiredMixShortsPct(0.85, s)).toBe(0.82);
  });

  it("audience met but consideration short → demo-led 0.6", () => {
    const s = stratWith({ subs: AUDIENCE_GOAL, watchHours365: CONSIDERATION_HOURS_GOAL - 1 });
    expect(desiredMixShortsPct(0.8, s)).toBe(0.6);
  });

  it("ad-view surge (≥50% of the reach goal) → 0.85, and outranks the low-audience branch", () => {
    const s = stratWith({ subs: 5, shortsViews90: AD_VIEWS_GOAL / 2 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
    // Just under the surge line falls back to the audience branch.
    const under = stratWith({ subs: 5, shortsViews90: AD_VIEWS_GOAL / 2 - 1 });
    expect(desiredMixShortsPct(0.6, under)).toBe(0.82);
  });

  it("reads ad views from formatPerf.short ahead of channel.shortsViews90", () => {
    const s = stratWith(
      { subs: 5, shortsViews90: 0 },
      { formatPerf: { short: { watchMin: 0, subs: 0, views: AD_VIEWS_GOAL, n: 3 } } },
    );
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
  });

  it("all targets met → base mix passthrough, still clamped", () => {
    const s = stratWith({ subs: AUDIENCE_GOAL, watchHours365: CONSIDERATION_HOURS_GOAL });
    expect(desiredMixShortsPct(0.7, s)).toBe(0.7);
    expect(desiredMixShortsPct(0.1, s)).toBe(MIX_MIN);
    expect(desiredMixShortsPct(1, s)).toBe(MIX_MAX);
  });
});

describe("nearerPath", () => {
  it("picks shorts (reach) when ad-view progress leads consideration progress", () => {
    // 20% of the reach goal vs 10% of the consideration goal.
    const s = stratWith({
      watchHours365: CONSIDERATION_HOURS_GOAL * 0.1,
      shortsViews90: AD_VIEWS_GOAL * 0.2,
    });
    expect(nearerPath(s)).toBe("shorts");
  });

  it("picks watch (consideration) when demo watch progress leads or ties", () => {
    const s = stratWith({
      watchHours365: CONSIDERATION_HOURS_GOAL * 0.5,
      shortsViews90: AD_VIEWS_GOAL * 0.1,
    });
    expect(nearerPath(s)).toBe("watch");
    // Ties (including 0/0 with no strategy) resolve to watch.
    expect(nearerPath()).toBe("watch");
    expect(
      nearerPath(
        stratWith({
          watchHours365: CONSIDERATION_HOURS_GOAL * 0.1,
          shortsViews90: AD_VIEWS_GOAL * 0.1,
        }),
      ),
    ).toBe("watch");
  });
});

describe("mixReason", () => {
  it("labels each branch", () => {
    expect(mixReason()).toBe("default mix");
    expect(mixReason(stratWith({ subs: 5, shortsViews90: AD_VIEWS_GOAL }))).toBe(
      "ad views surging — scaling winning variants",
    );
    expect(mixReason(stratWith({ subs: 5 }))).toBe("building audience — variant-led testing");
    expect(mixReason(stratWith({ subs: AUDIENCE_GOAL, watchHours365: 100 }))).toBe(
      "chasing consideration — more demos",
    );
    expect(
      mixReason(stratWith({ subs: AUDIENCE_GOAL, watchHours365: CONSIDERATION_HOURS_GOAL })),
    ).toBe("targets met — balanced program");
  });
});
