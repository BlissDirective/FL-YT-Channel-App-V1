/**
 * anthropic-batch.ts — JSONL result parsing for the Message Batches path
 * (Harness C6). Pure functions; the network paths degrade to parallel and
 * aren't unit-tested here.
 */
import { describe, expect, it } from "vitest";
import { collectBatchResults, parseBatchResultLine } from "@/lib/adapters/anthropic-batch";

describe("parseBatchResultLine", () => {
  it("extracts a succeeded message", () => {
    const line = JSON.stringify({
      custom_id: "2",
      result: { type: "succeeded", message: { content: [{ type: "text", text: "hi" }], usage: { input_tokens: 1, output_tokens: 1 } } },
    });
    const parsed = parseBatchResultLine(line);
    expect(parsed?.customId).toBe("2");
    expect(parsed?.result?.content[0].text).toBe("hi");
  });

  it("returns null result for a failed/errored request but keeps the id", () => {
    const line = JSON.stringify({ custom_id: "1", result: { type: "errored" } });
    expect(parseBatchResultLine(line)).toEqual({ customId: "1", result: null });
  });

  it("ignores blank and malformed lines", () => {
    expect(parseBatchResultLine("")).toBeNull();
    expect(parseBatchResultLine("{not json")).toBeNull();
    expect(parseBatchResultLine(JSON.stringify({ no_id: true }))).toBeNull();
  });
});

describe("collectBatchResults", () => {
  it("realigns out-of-order results to input order with null gaps", () => {
    const jsonl = [
      JSON.stringify({ custom_id: "2", result: { type: "succeeded", message: { content: [{ type: "text", text: "c" }], usage: { input_tokens: 0, output_tokens: 0 } } } }),
      JSON.stringify({ custom_id: "0", result: { type: "succeeded", message: { content: [{ type: "text", text: "a" }], usage: { input_tokens: 0, output_tokens: 0 } } } }),
    ].join("\n");
    const results = collectBatchResults(jsonl, 3);
    expect(results[0]?.content[0].text).toBe("a");
    expect(results[1]).toBeNull(); // never returned
    expect(results[2]?.content[0].text).toBe("c");
  });
});
