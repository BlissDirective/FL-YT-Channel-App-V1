/**
 * Auto-Rescript Stage A (Fable5-Auto-Rescript-Spec.md §7): the pure gating —
 * env kill-switch parsing and the fire predicate truth table.
 */
import { describe, expect, it } from "vitest";
import { autoRescriptMode, shouldAutoRescript } from "@/lib/pipeline/auto-rescript";

describe("autoRescriptMode (env kill-switch, default OFF)", () => {
  it.each([
    ["on", "on"],
    ["dry", "dry"],
    ["off", "off"],
    ["1", "off"], // only the exact tokens enable anything
    ["true", "off"],
    ["", "off"],
    [undefined, "off"],
  ] as const)("%j → %s", (env, mode) => {
    expect(autoRescriptMode(env)).toBe(mode);
  });
});

describe("shouldAutoRescript truth table", () => {
  const cases: [boolean, boolean, boolean, boolean][] = [
    // enabled, autoPilot, alreadyRescripted → fires
    [true, true, false, true],
    [true, true, true, false], // once per video — the durable bound
    [true, false, false, false], // manual/build-run videos: no continuation → guidance-hold
    [false, true, false, false], // kill-switch off
    [false, false, true, false],
  ];
  for (const [enabled, autoPilot, alreadyRescripted, fires] of cases) {
    it(`enabled=${enabled} autoPilot=${autoPilot} already=${alreadyRescripted} → ${fires}`, () => {
      expect(shouldAutoRescript({ enabled, autoPilot, alreadyRescripted })).toBe(fires);
    });
  }
});
