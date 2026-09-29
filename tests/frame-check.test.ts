/**
 * Keyframe full-frame gate (lesson Q15): a still framed inside blurred
 * letterbox bands is re-rolled before any clip spend, every attempt is paid
 * for, and after FRAME_ATTEMPTS failures the caller holds the video.
 */
import { describe, expect, it } from "vitest";
import { FRAME_ATTEMPTS, firstFullFrame, type FrameVerdict } from "@/lib/adapters/frame-check";

const still = (n: number) => ({ image: Buffer.from([n]), costUsd: 0.09 });
const verdict = (fullFrame: boolean): FrameVerdict => ({ fullFrame, reason: fullFrame ? "fills frame" : "blurred bands top and bottom", costUsd: 0.001 });

describe("firstFullFrame", () => {
  it("accepts the first full-frame still without re-rolling", async () => {
    let gens = 0;
    const seen: number[] = [];
    const r = await firstFullFrame(async () => still(++gens), async () => verdict(true), async (o) => void seen.push(o.image[0]));
    expect(r).toEqual({ ok: true, out: still(1) });
    expect(gens).toBe(1);
    expect(seen).toEqual([1]);
  });

  it("re-rolls a letterboxed still and records every attempt's cost", async () => {
    let gens = 0;
    const verdicts = [verdict(false), verdict(true)];
    const seen: (boolean | undefined)[] = [];
    const r = await firstFullFrame(
      async () => still(++gens),
      async () => verdicts.shift()!,
      async (_o, v) => void seen.push(v?.fullFrame),
    );
    expect(r.ok && r.out.image[0]).toBe(2);
    expect(seen).toEqual([false, true]);
  });

  it(`gives up after ${FRAME_ATTEMPTS} letterboxed stills with the reasons`, async () => {
    let gens = 0;
    const r = await firstFullFrame(async () => still(++gens), async () => verdict(false), async () => {});
    expect(gens).toBe(FRAME_ATTEMPTS);
    expect(r).toEqual({ ok: false, reasons: Array(FRAME_ATTEMPTS).fill("blurred bands top and bottom") });
  });

  it("never blocks when the check is unavailable (null accepts)", async () => {
    const r = await firstFullFrame(async () => still(7), async () => null, async () => {});
    expect(r.ok).toBe(true);
  });
});
