/**
 * requireCronAuth — bearer auth for /api/cron/* (header only since Phase 1;
 * query params land in access logs), constant-time via secureEquals.
 * These tests pin the fail-open/fail-closed matrix.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { secureEquals } from "@/lib/secure-compare";

function fakeRequest(opts: { authorization?: string; url?: string } = {}): NextRequest {
  const headers = new Headers();
  if (opts.authorization) headers.set("authorization", opts.authorization);
  return {
    headers,
    nextUrl: new URL(opts.url ?? "https://app.test/api/cron/build-runner"),
  } as never;
}

const ENV_KEYS = ["CRON_SECRET", "VERCEL", "ALLOW_UNAUTHENTICATED_CRON"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("requireCronAuth with CRON_SECRET set", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
  });

  it("allows a correct Bearer token", () => {
    expect(requireCronAuth(fakeRequest({ authorization: "Bearer s3cret" }))).toBeNull();
  });

  it("rejects a wrong Bearer token with 401", async () => {
    const res = requireCronAuth(fakeRequest({ authorization: "Bearer nope" }));
    expect(res?.status).toBe(401);
    await expect(res!.json()).resolves.toEqual({ ok: false, error: "unauthorized" });
  });

  it("rejects a missing Authorization header with 401", () => {
    expect(requireCronAuth(fakeRequest())?.status).toBe(401);
  });

  it("rejects the secret via ?key= — bearer header only (Phase 1)", () => {
    const req = fakeRequest({ url: "https://app.test/api/cron/build-runner?key=s3cret" });
    expect(requireCronAuth(req)?.status).toBe(401);
  });

  it("trims both sides (secrets pasted with trailing newlines still match)", () => {
    process.env.CRON_SECRET = "s3cret\n";
    expect(requireCronAuth(fakeRequest({ authorization: "Bearer s3cret " }))).toBeNull();
  });

  it("bearer prefix is case-insensitive", () => {
    expect(requireCronAuth(fakeRequest({ authorization: "bearer s3cret" }))).toBeNull();
  });
});

describe("requireCronAuth with CRON_SECRET unset", () => {
  it("fails CLOSED (503) on hosted deploys (VERCEL set)", async () => {
    process.env.VERCEL = "1";
    const res = requireCronAuth(fakeRequest({ authorization: "Bearer anything" }));
    expect(res?.status).toBe(503);
    await expect(res!.json()).resolves.toEqual({
      ok: false,
      error: "CRON_SECRET not configured",
    });
  });

  it("treats a whitespace-only secret as unset (still 503 on Vercel)", () => {
    process.env.VERCEL = "1";
    process.env.CRON_SECRET = "   ";
    expect(requireCronAuth(fakeRequest())?.status).toBe(503);
  });

  it("runs freely locally (no VERCEL env) so the mock stack needs zero config", () => {
    expect(requireCronAuth(fakeRequest())).toBeNull();
  });

  it("fails CLOSED (503) on any production build, not just Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(requireCronAuth(fakeRequest())?.status).toBe(503);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("ALLOW_UNAUTHENTICATED_CRON=1 is the explicit opt-out for CI/mock stacks", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.ALLOW_UNAUTHENTICATED_CRON = "1";
    try {
      expect(requireCronAuth(fakeRequest())).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("secureEquals", () => {
  it("matches equal strings and rejects different ones", () => {
    expect(secureEquals("abc", "abc")).toBe(true);
    expect(secureEquals("abc", "abd")).toBe(false);
    expect(secureEquals("abc", "abcd")).toBe(false); // length differences too
  });

  it("never matches null/undefined/empty inputs", () => {
    expect(secureEquals(null, "x")).toBe(false);
    expect(secureEquals("x", undefined)).toBe(false);
    expect(secureEquals("", "")).toBe(false);
    expect(secureEquals(null, null)).toBe(false);
  });
});
