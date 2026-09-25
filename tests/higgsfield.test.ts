/**
 * Higgsfield adapter — credential shapes, request builders for the locked
 * models (Cinema Studio 4.0, SOUL Standard, Genjutsu), and the submit/poll
 * lifecycle incl. the out-of-credits breaker and moderation handling.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const markProviderDown = vi.fn(async () => {});
const markProviderUp = vi.fn(async () => {});
vi.mock("@/lib/pipeline/provider-health", () => ({
  markProviderDown: (...a: unknown[]) => markProviderDown(...(a as [])),
  markProviderUp: (...a: unknown[]) => markProviderUp(...(a as [])),
  isTerminalProviderError: () => false,
}));

import {
  animateWithGenjutsu,
  cinemaStudioInput,
  genjutsuUsdPerSec,
  hfPoll,
  hfSubmit,
  higgsfieldCredential,
  higgsfieldCredentialShape,
  isConcurrencyLimit,
  soulStandardInput,
} from "@/lib/adapters/higgsfield";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("HIGGSFIELD_API_KEY", "kid:ksecret");
  markProviderDown.mockClear();
  markProviderUp.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("credentials", () => {
  it("uses the combined HIGGSFIELD_API_KEY (KEY_ID:KEY_SECRET)", () => {
    expect(higgsfieldCredential({ HIGGSFIELD_API_KEY: " a:b " } as never)).toBe("a:b");
    expect(higgsfieldCredentialShape({ HIGGSFIELD_API_KEY: "a:b" } as never)).toBe("combined");
  });
  it("accepts the SDK's id + secret pair", () => {
    const env = { HF_API_KEY_ID: "a", HF_API_KEY_SECRET: "b" } as never;
    expect(higgsfieldCredential(env)).toBe("a:b");
    expect(higgsfieldCredentialShape(env)).toBe("pair");
  });
  it("flags a value without the secret half, and absence", () => {
    expect(higgsfieldCredentialShape({ HIGGSFIELD_API_KEY: "only-id" } as never)).toBe("missing-secret");
    expect(higgsfieldCredentialShape({} as never)).toBe("absent");
  });
});

describe("request builders", () => {
  it("Cinema Studio: text-to-video without a keyframe, clamped to 4–30s at 720p 16:9", () => {
    const i = cinemaStudioInput({ prompt: "waves", durationSec: 45 });
    expect(i).toEqual({ prompt: "waves", duration: 30, resolution: "720p", aspect_ratio: "16:9" });
    expect(cinemaStudioInput({ prompt: "x", durationSec: 1 }).duration).toBe(4);
  });
  it("Cinema Studio: the keyframe rides image_urls and is anchored by <<<image_1>>>", () => {
    const i = cinemaStudioInput({ prompt: "waves", durationSec: 8, imageUrls: ["https://x/k.jpg"] });
    expect(i.image_urls).toEqual(["https://x/k.jpg"]);
    expect(String(i.prompt)).toContain("<<<image_1>>>");
  });
  it("Cinema Studio: omits unset creative controls (the literal 'auto' is rejected)", () => {
    const i = cinemaStudioInput({ prompt: "x", durationSec: 5, controls: { genre: "noir" } });
    expect(i.genre).toBe("noir");
    expect("pacing" in i).toBe(false);
  });
  it("SOUL Standard: 1080p 16:9 single image, seed mapped into 1..1_000_000", () => {
    const i = soulStandardInput({ prompt: "p", seed: 2_147_483_000 });
    expect(i).toMatchObject({ aspect_ratio: "16:9", resolution: "1080p", batch_size: 1 });
    expect(Number(i.seed)).toBeGreaterThanOrEqual(1);
    expect(Number(i.seed)).toBeLessThanOrEqual(1_000_000);
  });
  it("Genjutsu promo price applies until 2026-10-01", () => {
    expect(genjutsuUsdPerSec(new Date("2026-09-25T00:00:00Z"))).toBe(0.159);
    expect(genjutsuUsdPerSec(new Date("2026-10-02T00:00:00Z"))).toBe(0.318);
  });
});

describe("lifecycle", () => {
  it("detects the concurrency limit (400 with a message, or 429)", () => {
    expect(isConcurrencyLimit(400, "Maximum number of concurrent requests (4)")).toBe(true);
    expect(isConcurrencyLimit(429, "")).toBe(true);
    expect(isConcurrencyLimit(400, "invalid duration")).toBe(false);
  });

  it("submits with the Key auth header and returns the handle", async () => {
    const fetchMock = vi.fn(async () =>
      json({ status: "queued", request_id: "r1", status_url: "https://api.higgsfield.ai/requests/r1/status" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const h = await hfSubmit("higgsfield/cinema-studio/4.0", { prompt: "x" });
    expect(h).toMatchObject({ requestId: "r1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.higgsfield.ai/higgsfield/cinema-studio/4.0");
    expect((init.headers as Record<string, string>).Authorization).toBe("Key kid:ksecret");
  });

  it("403 (out of credits) trips the breaker and fails fast — no retry", async () => {
    const fetchMock = vi.fn(async () => new Response("Not enough credits", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(hfSubmit("higgsfield/cinema-studio/4.0", { prompt: "x" })).rejects.toThrow(/403/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(markProviderDown).toHaveBeenCalledWith("higgsfield", expect.stringContaining("403"));
  });

  it("422 validation errors are not retried", async () => {
    const fetchMock = vi.fn(async () => new Response("bad", { status: 422 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(hfSubmit("e", {})).rejects.toThrow(/422/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("polls until completed and surfaces nsfw as a failure", async () => {
    vi.useFakeTimers();
    const statuses = [{ status: "queued" }, { status: "in_progress" }, { status: "completed", video: { url: "u" } }];
    vi.stubGlobal("fetch", vi.fn(async () => json(statuses.shift())));
    const done = hfPoll({ requestId: "r", statusUrl: "s" }, 60_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(done).resolves.toMatchObject({ status: "completed" });

    vi.stubGlobal("fetch", vi.fn(async () => json({ status: "nsfw" })));
    const bad = hfPoll({ requestId: "r", statusUrl: "s" }, 60_000);
    const assertion = expect(bad).rejects.toThrow(/nsfw/);
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it("Genjutsu refuses a driving clip under 4s before spending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      animateWithGenjutsu({ characterImageUrls: ["https://x/a.png"], drivingVideoUrl: "https://x/d.mp4", drivingSec: 3 }),
    ).rejects.toThrow(/4 seconds/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
