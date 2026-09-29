import { describe, expect, it } from "vitest";
import { inShard, isLeadShard, renderShardFromEnv, shardOf } from "../packages/render/src/render-shard";

describe("render shards", () => {
  const ids = Array.from({ length: 300 }, (_, i) => `${i.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`);

  it("puts every video in exactly one lane, stably", () => {
    for (const id of ids) {
      const lanes = [0, 1, 2].filter((index) => inShard(id, { index, count: 3 }));
      expect(lanes).toEqual([shardOf(id, 3)]);
      expect(shardOf(id, 3)).toBe(shardOf(id, 3));
    }
  });

  it("spreads videos across lanes", () => {
    const counts = [0, 0, 0];
    for (const id of ids) counts[shardOf(id, 3)]++;
    for (const c of counts) expect(c).toBeGreaterThan(60);
  });

  it("defaults to one lane that owns everything and runs the singletons", () => {
    const s = renderShardFromEnv({});
    expect(s).toEqual({ index: 0, count: 1 });
    expect(inShard("anything", s)).toBe(true);
    expect(isLeadShard(s)).toBe(true);
    expect(renderShardFromEnv({ RENDER_SHARD: "2", RENDER_SHARDS: "3" })).toEqual({ index: 2, count: 3 });
    expect(isLeadShard({ index: 2, count: 3 })).toBe(false);
    expect(renderShardFromEnv({ RENDER_SHARD: "5", RENDER_SHARDS: "3" }).index).toBe(0);
  });
});
