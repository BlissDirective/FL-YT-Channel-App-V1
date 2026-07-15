/**
 * Launch waitlist — pure input validation. The action wires these to the
 * request/DB; the acceptance rules (what counts as a valid email, what UTM we
 * keep) live here where they're testable.
 */
import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  normalizeEmail,
  sanitizeUtm,
  sanitizeReferrer,
} from "@/lib/launch/validate";

describe("isValidEmail", () => {
  it("accepts ordinary addresses (case/space-insensitively)", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
    expect(isValidEmail("  First.Last@Sub.Domain.io ")).toBe(true);
    expect(isValidEmail("op+tag@studio.co")).toBe(true);
  });

  it("rejects malformed, empty, spaced, and over-long inputs", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("no-at")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
    expect(isValidEmail("two@@x.com")).toBe(false);
    expect(isValidEmail(`${"x".repeat(250)}@b.com`)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
  });
});

describe("sanitizeUtm", () => {
  it("keeps only known keys, trims + caps values, drops empties", () => {
    expect(
      sanitizeUtm({ source: "  twitter ", medium: "social", junk: "x", term: "" }),
    ).toEqual({ source: "twitter", medium: "social" });
  });

  it("returns {} for null/undefined/non-string values", () => {
    expect(sanitizeUtm(null)).toEqual({});
    expect(sanitizeUtm(undefined)).toEqual({});
    expect(sanitizeUtm({ source: 42 as unknown as string })).toEqual({});
  });

  it("caps very long values to 200 chars", () => {
    const out = sanitizeUtm({ campaign: "y".repeat(500) });
    expect(out.campaign?.length).toBe(200);
  });
});

describe("sanitizeReferrer", () => {
  it("bounds and trims, or returns undefined", () => {
    expect(sanitizeReferrer("  https://x.com/a  ")).toBe("https://x.com/a");
    expect(sanitizeReferrer("")).toBeUndefined();
    expect(sanitizeReferrer(null)).toBeUndefined();
    expect(sanitizeReferrer("z".repeat(600))?.length).toBe(500);
  });
});
