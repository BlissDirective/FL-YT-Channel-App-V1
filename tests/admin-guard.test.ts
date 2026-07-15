/**
 * Admin allowlist — the pure decision core behind assertAdmin()/getIsAdmin().
 * The session/env wiring in admin-guard.ts is a thin adapter over these; the
 * membership rule (parse → normalize → match) is what carries the security
 * weight, so it's pinned here.
 */
import { describe, expect, it } from "vitest";
import {
  parseAdminEmails,
  isAdminEmail,
  decideAdmin,
  ForbiddenError,
} from "@/lib/admin-emails";

describe("parseAdminEmails", () => {
  it("returns [] for undefined/null/empty (fail closed — no admins)", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails(null)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });

  it("splits, trims, lowercases", () => {
    expect(parseAdminEmails("  A@X.com , B@Y.COM ")).toEqual(["a@x.com", "b@y.com"]);
  });

  it("dedupes case-insensitively and drops empties from stray commas", () => {
    expect(parseAdminEmails("a@x.com,,A@X.com, ,a@x.com")).toEqual(["a@x.com"]);
  });
});

describe("isAdminEmail", () => {
  const allow = parseAdminEmails("owner@studio.com, ops@studio.com");

  it("matches allowlisted emails regardless of case/whitespace", () => {
    expect(isAdminEmail("owner@studio.com", allow)).toBe(true);
    expect(isAdminEmail("  OWNER@STUDIO.COM ", allow)).toBe(true);
    expect(isAdminEmail("ops@studio.com", allow)).toBe(true);
  });

  it("rejects non-allowlisted, null, undefined, and empty", () => {
    expect(isAdminEmail("stranger@evil.com", allow)).toBe(false);
    expect(isAdminEmail(null, allow)).toBe(false);
    expect(isAdminEmail(undefined, allow)).toBe(false);
    expect(isAdminEmail("", allow)).toBe(false);
  });

  it("rejects everyone when the allowlist is empty", () => {
    expect(isAdminEmail("owner@studio.com", [])).toBe(false);
  });
});

describe("decideAdmin", () => {
  const allow = parseAdminEmails("owner@studio.com");

  it("true only for an allowlisted authenticated user", () => {
    expect(decideAdmin({ email: "owner@studio.com" }, allow)).toBe(true);
  });

  it("false for a non-admin, an emailless user, or no session", () => {
    expect(decideAdmin({ email: "someone@else.com" }, allow)).toBe(false);
    expect(decideAdmin({ email: null }, allow)).toBe(false);
    expect(decideAdmin({}, allow)).toBe(false);
    expect(decideAdmin(null, allow)).toBe(false);
    expect(decideAdmin(undefined, allow)).toBe(false);
  });

  it("false for everyone when no admins are configured", () => {
    expect(decideAdmin({ email: "owner@studio.com" }, [])).toBe(false);
  });
});

describe("ForbiddenError", () => {
  it("is a named Error subclass distinct from a generic throw", () => {
    const e = new ForbiddenError();
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("ForbiddenError");
  });
});
