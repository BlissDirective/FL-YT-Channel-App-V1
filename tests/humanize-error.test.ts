/**
 * humanizeProviderError — turns raw provider errors (walls of JSON) into
 * short, actionable hold reasons for the Library tile / Asset Canvas.
 * The screenshot case (Anthropic out of credits) is the headline test.
 */
import { describe, expect, it } from "vitest";
import { humanizeProviderError } from "@/lib/pipeline/engine";

describe("humanizeProviderError", () => {
  it("the reported case: Anthropic credit balance too low → one clear line", () => {
    const raw =
      'Claude API error 400: {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."}}';
    const out = humanizeProviderError(raw);
    expect(out).toBe(
      "Anthropic API is out of credits — add credits in the Anthropic console (Plans & Billing), then press Resume.",
    );
    expect(out).not.toContain("{"); // no raw JSON leaks to the card
  });

  it("401 / bad key", () => {
    expect(humanizeProviderError("Claude API error 401: invalid x-api-key")).toMatch(
      /key rejected \(401\)/,
    );
  });

  it("429 rate limit", () => {
    expect(humanizeProviderError("429 Too Many Requests: rate_limit")).toMatch(/rate limit/i);
  });

  it("529 / overloaded / 5xx → temporary", () => {
    expect(humanizeProviderError("Claude API error 529: overloaded")).toMatch(/temporarily unavailable/i);
  });

  it("unknown error: strips embedded JSON and caps length", () => {
    const out = humanizeProviderError('boom happened {"lots":"of json"}');
    expect(out).toBe("boom happened");
    expect(humanizeProviderError("x".repeat(400)).length).toBe(180);
  });
});
