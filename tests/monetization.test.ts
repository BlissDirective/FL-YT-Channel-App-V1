import { describe, expect, it } from "vitest";
import {
  MIX_MAX,
  MIX_MIN,
  YPP_SHORTS_VIEWS,
  YPP_SUBS,
  YPP_WATCH_HOURS,
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

  it("below 1,000 subs → Shorts-led 0.82 regardless of base mix", () => {
    const s = stratWith({ subs: YPP_SUBS - 1, watchHours365: 9999 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.82);
    expect(desiredMixShortsPct(0.85, s)).toBe(0.82);
  });

  it("subs met but watch-hours short → long-form-led 0.6", () => {
    const s = stratWith({ subs: YPP_SUBS, watchHours365: YPP_WATCH_HOURS - 1 });
    expect(desiredMixShortsPct(0.8, s)).toBe(0.6);
  });

  it("Shorts surge (≥50% of 10M) → 0.85, and outranks the low-subs branch", () => {
    const s = stratWith({ subs: 5, shortsViews90: YPP_SHORTS_VIEWS / 2 });
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
    // Just under the surge line falls back to the subs branch.
    const under = stratWith({ subs: 5, shortsViews90: YPP_SHORTS_VIEWS / 2 - 1 });
    expect(desiredMixShortsPct(0.6, under)).toBe(0.82);
  });

  it("reads Shorts views from formatPerf.short ahead of channel.shortsViews90", () => {
    const s = stratWith(
      { subs: 5, shortsViews90: 0 },
      { formatPerf: { short: { watchMin: 0, subs: 0, views: YPP_SHORTS_VIEWS, n: 3 } } },
    );
    expect(desiredMixShortsPct(0.6, s)).toBe(0.85);
  });

  it("fully monetized track → base mix passthrough, still clamped", () => {
    const s = stratWith({ subs: YPP_SUBS, watchHours365: YPP_WATCH_HOURS });
    expect(desiredMixShortsPct(0.7, s)).toBe(0.7);
    expect(desiredMixShortsPct(0.1, s)).toBe(MIX_MIN);
    expect(desiredMixShortsPct(1, s)).toBe(MIX_MAX);
  });
});

describe("nearerPath", () => {
  it("picks shorts when Shorts progress leads watch-hours progress", () => {
    // 20% of Shorts path vs 10% of watch path.
    const s = stratWith({ watchHours365: 400, shortsViews90: 2_000_000 });
    expect(nearerPath(s)).toBe("shorts");
  });

  it("picks watch when watch-hours progress leads or ties", () => {
    const s = stratWith({ watchHours365: 2000, shortsViews90: 1_000_000 });
    expect(nearerPath(s)).toBe("watch");
    // Ties (including 0/0 with no strategy) resolve to watch.
    expect(nearerPath()).toBe("watch");
    expect(nearerPath(stratWith({ watchHours365: 400, shortsViews90: 1_000_000 }))).toBe("watch");
  });
});

describe("mixReason", () => {
  it("labels each branch", () => {
    expect(mixReason()).toBe("default mix");
    expect(mixReason(stratWith({ subs: 5, shortsViews90: YPP_SHORTS_VIEWS }))).toBe(
      "Shorts surging — pushing Shorts",
    );
    expect(mixReason(stratWith({ subs: 5 }))).toBe("chasing subscribers — Shorts-led");
    expect(mixReason(stratWith({ subs: YPP_SUBS, watchHours365: 100 }))).toBe(
      "chasing watch-hours — more long-form",
    );
    expect(mixReason(stratWith({ subs: YPP_SUBS, watchHours365: YPP_WATCH_HOURS }))).toBe(
      "monetized track — balanced",
    );
  });
});
