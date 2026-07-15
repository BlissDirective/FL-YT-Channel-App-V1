/**
 * Director Mode UI isolation (Fable-5-Director-Mode-Build-Spec.md §10.2.6),
 * the D3 merge gate. The vitest harness can't render React Server Components,
 * so this is a source-contract test: it pins that the canvas + library pages
 * gate autonomous-only surfaces behind `!directorMode` and director-only
 * surfaces behind `directorMode`, so a future edit that leaks one mode's UI
 * into the other fails loudly here.
 *
 * (A full click-through belongs in the authed Playwright suite; this guards the
 * composition seam that decides which surface renders.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const CANVAS = "src/app/(app)/projects/[id]/videos/[vid]/page.tsx";
const LIBRARY = "src/app/(app)/projects/[id]/library/page.tsx";
const CONSOLE = "src/app/(app)/projects/[id]/videos/[vid]/director-console.tsx";
const AUTOPILOT = "src/app/(app)/projects/[id]/autopilot/page.tsx";

describe("§10.2.6 canvas page mode isolation", () => {
  const src = read(CANVAS);

  it("derives directorMode from the project's pipeline_mode", () => {
    expect(src).toMatch(/const directorMode\s*=\s*\(project\.pipeline_mode/);
  });

  it("renders the Director console ONLY in director mode", () => {
    expect(src).toMatch(/\{directorMode && \(\s*<DirectorConsole/);
  });

  it("gates the autonomous checkpoint gate behind !directorMode", () => {
    expect(src).toMatch(/gate && !directorMode/);
  });

  it("gates the autonomous canvas controls behind !directorMode", () => {
    expect(src).toMatch(/!directorMode && \(\s*<CanvasControls/);
  });
});

describe("§10.2.6 library page mode isolation", () => {
  const src = read(LIBRARY);

  it("renders the director idea generator vs the autonomous NewAsset by mode", () => {
    // The ternary: {directorMode ? <DirectorIdeaGenerator/> : (<NewAsset/> …)}
    expect(src).toMatch(/directorMode \? \(\s*<DirectorIdeaGenerator/);
    expect(src).toMatch(/<NewAsset projectId=/);
  });

  it("suppresses autopilot chips for director projects on the signal strip", () => {
    expect(src).toMatch(/autopilot=\{directorMode \? undefined :/);
  });

  it("suppresses the autonomous operator state on tiles in director mode", () => {
    expect(src).toMatch(/autopilot=\{directorMode \? undefined : tile\.autopilot\}/);
  });
});

describe("§10.2.6 director console is tagged for mode assertions", () => {
  const src = read(CONSOLE);
  it("carries a data-mode=director marker for DOM/e2e assertions", () => {
    expect(src).toMatch(/data-mode="director"/);
  });
  it("wires every director stage action (no dead buttons)", () => {
    for (const action of [
      "directorRunStageAction",
      "directorReviewStageAction",
      "directorAdvanceAction",
      "directorReviseAction",
      "directorRerenderAction",
      "directorStepBackAction",
      "directorKillAction",
      "directorPublishAction",
      "directorRunAutofixAction",
      "directorRunSelfWatchAction",
      "directorAutoRescriptProposalAction",
    ]) {
      expect(src).toContain(action);
    }
  });
});

describe("§10.2.6 D5 — autonomous batch surfaces hidden in Director Mode", () => {
  it("the Autopilot page redirects director projects to the Library", () => {
    const src = read(AUTOPILOT);
    expect(src).toMatch(/=== "director"\)\s*\{\s*redirect\(`\/projects\/\$\{id\}\/library`\)/s);
  });
});
