import { describe, expect, it } from "vitest";
import { parseLoudnormJson } from "../packages/render/src/loudness";

describe("loudnorm measurement parsing", () => {
  it("reads the JSON block ffmpeg prints", () => {
    const stderr = `[Parsed_loudnorm_0 @ 0x1]\n{\n\t"input_i" : "-30.90",\n\t"input_tp" : "-7.20",\n\t"input_lra" : "6.10",\n\t"input_thresh" : "-41.20",\n\t"output_i" : "-14.00",\n\t"target_offset" : "0.10"\n}\n`;
    expect(parseLoudnormJson(stderr)?.input_i).toBe("-30.90");
  });
  it("rejects silence and garbage", () => {
    expect(parseLoudnormJson("no json here")).toBeNull();
    expect(parseLoudnormJson('{"input_i":"-inf","input_tp":"-inf","input_lra":"0","input_thresh":"-70","target_offset":"0"}')).toBeNull();
  });
});
