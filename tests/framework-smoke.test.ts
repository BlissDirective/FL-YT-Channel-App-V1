/**
 * Framework smoke pipeline (Batch 14 / C1) — the CI contract gate. Exercises
 * every stage on mock data and asserts each emits a schema-valid canonical
 * artifact. A stage-contract drift fails HERE, before a real run breaks.
 */
import { describe, expect, it } from "vitest";
import { runSmokePipeline, STAGE_ARTIFACTS } from "@studio/core";

describe("framework smoke pipeline", () => {
  it("runs the full stage chain and every artifact is schema-valid", () => {
    const result = runSmokePipeline();
    expect(result.ok).toBe(true);
    for (const s of result.stages) {
      expect(s.valid, `${s.kind}: ${s.errors.join("; ")}`).toBe(true);
    }
  });

  it("covers all six canonical stages", () => {
    const result = runSmokePipeline("the Bronze Age collapse");
    expect(result.stages.map((s) => s.kind)).toEqual([...STAGE_ARTIFACTS]);
  });

  it("is deterministic for a given topic", () => {
    expect(runSmokePipeline("x")).toEqual(runSmokePipeline("x"));
  });
});
