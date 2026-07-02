import { describe, expect, it } from "vitest";
import { attributionsFromAssets, buildAttributionBlock } from "@/lib/attribution";
import type { Asset } from "@/lib/db/types";

function makeAsset(overrides: Partial<Asset>): Asset {
  return {
    id: "a1",
    video_id: "v1",
    kind: "clip",
    storage_path: "clips/a1.mp4",
    provider: "pexels",
    beat_index: 0,
    meta: {},
    cost_usd: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const ccByClip = makeAsset({
  id: "cc",
  beat_index: 2,
  meta: {
    title: "City timelapse",
    author: "Jane Doe",
    sourceProvider: "openverse",
    sourceUrl: "https://example.com/clip/1",
    license: {
      label: "CC BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      requiresAttribution: true,
    },
  },
});

describe("attributionsFromAssets", () => {
  it("only includes clip assets that carry licence/source metadata", () => {
    const assets = [
      ccByClip,
      makeAsset({ id: "plain-clip", meta: {} }), // clip with no licence info
      makeAsset({ id: "vo", kind: "vo", meta: { license: { label: "X" } } }), // not a clip
    ];
    const result = attributionsFromAssets(assets);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      beatIndex: 2,
      title: "City timelapse",
      author: "Jane Doe",
      licenseLabel: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      sourceUrl: "https://example.com/clip/1",
      provider: "openverse",
      requiresAttribution: true,
    });
  });

  it("classifies unlabelled library/credited clips as Pexels-licensed, no attribution required", () => {
    const libClip = makeAsset({
      id: "lib",
      beat_index: 4,
      provider: "pexels",
      meta: { fromLibrary: true, credit: "John Smith" },
    });
    const [a] = attributionsFromAssets([libClip]);
    expect(a.licenseLabel).toBe("Pexels License");
    expect(a.requiresAttribution).toBe(false);
    expect(a.author).toBe("John Smith"); // credit fallback when author is absent
    expect(a.provider).toBe("pexels"); // falls back to the asset provider
    expect(a.title).toBe("Beat 5 footage"); // 1-based fallback title
  });
});

describe("buildAttributionBlock", () => {
  it("returns an empty string when nothing requires attribution", () => {
    const libClip = makeAsset({ id: "lib", meta: { fromLibrary: true } });
    expect(buildAttributionBlock([libClip])).toBe("");
    expect(buildAttributionBlock([])).toBe("");
  });

  it("builds a credits block listing only attribution-required licences", () => {
    const libClip = makeAsset({ id: "lib", meta: { fromLibrary: true } });
    const block = buildAttributionBlock([ccByClip, libClip]);
    expect(block).toBe(
      [
        "Credits / attributions:",
        '• "City timelapse" by Jane Doe, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — https://example.com/clip/1',
      ].join("\n"),
    );
  });

  it("omits the licence URL parenthetical and source suffix when absent", () => {
    const bare = makeAsset({
      id: "bare",
      beat_index: 0,
      meta: {
        title: "Foggy hills",
        author: "Sam",
        license: { label: "CC BY 3.0", requiresAttribution: true },
      },
    });
    expect(buildAttributionBlock([bare])).toBe(
      'Credits / attributions:\n• "Foggy hills" by Sam, CC BY 3.0',
    );
  });
});
