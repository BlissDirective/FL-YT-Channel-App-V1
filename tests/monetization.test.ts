import { describe, expect, it } from "vitest";
import {
  MIX_MAX,
  MIX_MIN,
  COMPLETION_HOURS_GOAL,
  LEARNERS_GOAL,
  PREVIEW_VIEWS_GOAL,
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

  it("below the enrollment floor → preview-led 0.82 regardless of base mix", () => {
    const s = stratWith({ subs: LEARNERS_GOAL - 1, watchHours365: 9999 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.82);
    expect(desiredMixShortsPct(0.85, s)).toBe(0.82);
  });

  it("enrollment met but completion short → full-lesson-led 0.6", () => {
    const s = stratWith({ subs: LEARNERS_GOAL, watchHours365: COMPLETION_HOURS_GOAL - 1 });
    expect(desiredMixShortsPct(0.8, s)).toBe(0.6);
  });

  it("preview surge (≥50% of the reach goal) → 0.85, and outranks the low-enrollment branch", () => {
    const s = stratWith({ subs: 5, shortsViews90: PREVIEW_VIEWS_GOAL / 2 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
    // Just under the surge line falls back to the enrollment branch.
    const under = stratWith({ subs: 5, shortsViews90: PREVIEW_VIEWS_GOAL / 2 - 1 });
    expect(desiredMixShortsPct(0.6, under)).toBe(0.82);
  });

  it("reads preview views from formatPerf.short ahead of channel.shortsViews90", () => {
    const s = stratWith(
      { subs: 5, shortsViews90: 0 },
      { formatPerf: { short: { watchMin: 0, subs: 0, views: PREVIEW_VIEWS_GOAL, n: 3 } } },
    );
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
  });

  it("all targets met → base mix passthrough, still clamped", () => {
    const s = stratWith({ subs: LEARNERS_GOAL, watchHours365: COMPLETION_HOURS_GOAL });
    expect(desiredMixShortsPct(0.7, s)).toBe(0.7);
    expect(desiredMixShortsPct(0.1, s)).toBe(MIX_MIN);
    expect(desiredMixShortsPct(1, s)).toBe(MIX_MAX);
  });
});

describe("nearerPath", () => {
  it("picks shorts (enrollment) when preview progress leads completion progress", () => {
    // 20% of the preview goal vs 10% of the completion goal.
    const s = stratWith({
      watchHours365: COMPLETION_HOURS_GOAL * 0.1,
      shortsViews90: PREVIEW_VIEWS_GOAL * 0.2,
    });
    expect(nearerPath(s)).toBe("shorts");
  });

  it("picks watch (completion) when lesson watch progress leads or ties", () => {
    const s = stratWith({
      watchHours365: COMPLETION_HOURS_GOAL * 0.5,
      shortsViews90: PREVIEW_VIEWS_GOAL * 0.1,
    });
    expect(nearerPath(s)).toBe("watch");
    // Ties (including 0/0 with no strategy) resolve to watch.
    expect(nearerPath()).toBe("watch");
    expect(
      nearerPath(
        stratWith({
          watchHours365: COMPLETION_HOURS_GOAL * 0.1,
          shortsViews90: PREVIEW_VIEWS_GOAL * 0.1,
        }),
      ),
    ).toBe("watch");
  });
});

describe("mixReason", () => {
  it("labels each branch", () => {
    expect(mixReason()).toBe("default mix");
    expect(mixReason(stratWith({ subs: 5, shortsViews90: PREVIEW_VIEWS_GOAL }))).toBe(
      "previews surging — more micro-lessons",
    );
    expect(mixReason(stratWith({ subs: 5 }))).toBe("growing enrollment — preview-led");
    expect(mixReason(stratWith({ subs: LEARNERS_GOAL, watchHours365: 100 }))).toBe(
      "chasing completion — more full lessons",
    );
    expect(
      mixReason(stratWith({ subs: LEARNERS_GOAL, watchHours365: COMPLETION_HOURS_GOAL })),
    ).toBe("program healthy — balanced");
  });
});
