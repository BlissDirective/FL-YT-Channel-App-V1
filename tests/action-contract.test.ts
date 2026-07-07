/**
 * UI-Redesign Phase 0 — the server-action contract.
 *
 * The redesign's core invariant (Fable-5-UI-Redesign.md §3.1): the UI mutates
 * the pipeline ONLY through the server actions in src/lib/actions/*, and the
 * new surfaces must call the same actions the old surfaces call. This test
 * pins that contract:
 *
 *  1. The exported action names + signatures match the checked-in manifest
 *     (tests/contracts/action-manifest.json). Any drift fails until the
 *     manifest is deliberately regenerated
 *     (`node tests/contracts/update-action-manifest.mjs`) and reviewed.
 *  2. Every action has at least one caller surface in src/ — so a redesign
 *     that deletes a page can't silently orphan the capability it hosted.
 *     Known pre-existing orphans are listed explicitly; Phase 7 either wires
 *     or removes them, and this list must shrink, never grow.
 */
import { describe, expect, it } from "vitest";
import {
  buildCallerInventory,
  buildManifest,
} from "./contracts/update-action-manifest.mjs";
import expected from "./contracts/action-manifest.json";

// Actions with no importing surface today (found during the Phase 0 audit,
// 2026-07-06): superseded by runAllOptimizerAction and the operator panel's
// start/pause actions respectively. Do NOT add to this list — wire the action
// to a surface or delete it instead.
// Phase 7 cleared the list: runOptimizerNowAction was re-homed to the Feed's
// "Generate insights"; runOperatorNowAction (no caller anywhere) was deleted.
// Keep this empty — wire new actions to a surface in the same PR that adds them.
const KNOWN_UNREFERENCED = new Set<string>([]);

describe("server-action contract manifest", () => {
  const actual = buildManifest() as Record<string, string[]>;

  it("modules match the checked-in manifest", () => {
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  });

  for (const [mod, sigs] of Object.entries(expected as Record<string, string[]>)) {
    it(`src/lib/actions/${mod}.ts exports exactly the pinned signatures`, () => {
      expect(actual[mod]).toEqual(sigs);
    });
  }
});

describe("every action has a caller surface", () => {
  const importers = buildCallerInventory() as Record<string, string[]>;
  const manifest = buildManifest() as Record<string, string[]>;

  for (const [mod, sigs] of Object.entries(manifest)) {
    for (const sig of sigs) {
      const name = sig.slice(0, sig.indexOf("("));
      if (KNOWN_UNREFERENCED.has(name)) continue;
      it(`${mod}.${name} is imported by at least one surface`, () => {
        expect(
          importers[name],
          `${name} lost its last caller — if a redesign phase removed the ` +
            `surface that used it, re-home the capability (Fable-5-UI-Redesign.md §4)`,
        ).toBeDefined();
        expect(importers[name].length).toBeGreaterThan(0);
      });
    }
  }

  it("the known-unreferenced list is exact (wire it up → remove it here)", () => {
    for (const name of KNOWN_UNREFERENCED) {
      expect(
        importers[name],
        `${name} now has a caller — remove it from KNOWN_UNREFERENCED`,
      ).toBeUndefined();
    }
  });
});
