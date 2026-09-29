import { describe, expect, it } from "vitest";
import {
  relocateCaptionedCenterLabels,
  buildDirectedEddContext,
  compileDirectedEdd,
  directedRuntimeSec,
  directedWarnings,
  parseDirectedScript,
  snapZoomMotion,
  validateEdd,
  type DirectedScript,
} from "@studio/core";

const P = "Cinematic 3D animated film, verbatim prompt.";

function s01(): unknown {
  return {
    format: "short",
    title: "The Button Said DO NOT PRESS",
    cast: { Pip: { color: "#FFB020" }, Brick: { color: "#7CFF4F" } },
    sections: [
      { sec: 10, videoPrompt: P, keyframePrompt: "KF 1", lines: [{ speaker: "Pip", text: "...Just a little look.", at: 1.5 }],
        labels: [{ at: 0.5, durationSec: 9, text: "DO NOT PRESS", position: "center" }], zooms: [{ at: 4.5 }] },
      { sec: 20, videoPrompt: P, keyframePrompt: "KF 2", lines: [{ speaker: "Pip", text: "Don't. Don't. Don't.", at: 4 }, { speaker: "Pip", text: "I'm not gonna.", at: 14 }],
        highlightWords: ["DON'T"], sfx: [{ at: 2, prompt: "casual whistle" }] },
      { sec: 8, videoPrompt: P, keyframePrompt: "KF 5", lines: [], endFrame: { fromSection: 0 }, model: "hf-seedance-2-5" },
    ],
    music: { prompt: "clarinet noodling" },
    sting: { at: 2.5, sec: 0.5 },
    outro: { mode: "overlay", sec: 2.5, cta: "Full episode → INKLIGHT" },
  };
}

describe("script snippets", () => {
  const withSnippets = () => {
    const raw = s01() as Record<string, unknown> & { sections: Record<string, unknown>[] };
    raw.snippets = { SET: "Matchbox kitchen, cream plaster wall.", MISO: "Field-mouse cook, navy headband." };
    raw.sections[0].keyframePrompt = "{{SET}} {{MISO}} Eye-level.";
    raw.sections[1].videoPrompt = "{{MISO}} slides the bowl.";
    return raw;
  };

  it("expands {{NAME}} everywhere and stores the full text", () => {
    const r = parseDirectedScript(withSnippets());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.script.sections[0].keyframePrompt).toBe("Matchbox kitchen, cream plaster wall. Field-mouse cook, navy headband. Eye-level.");
    expect(r.script.sections[1].videoPrompt).toBe("Field-mouse cook, navy headband. slides the bowl.");
    expect("snippets" in r.script).toBe(false);
    // Re-parsing the stored (expanded) script is a no-op.
    const again = parseDirectedScript(r.script);
    expect(again.ok && again.script.sections[0].keyframePrompt).toBe(r.script.sections[0].keyframePrompt);
  });

  it("rejects an unknown or nested snippet instead of sending {{NAME}} to the model", () => {
    const unknown = withSnippets();
    unknown.sections[2].videoPrompt = "{{NOPE}} walks in.";
    const r = parseDirectedScript(unknown);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("unknown snippet {{NOPE}}");

    const nested = withSnippets();
    (nested.snippets as Record<string, string>).BOTH = "{{SET}} and more";
    const n = parseDirectedScript(nested);
    expect(n.ok).toBe(false);
  });
});

describe("parseDirectedScript", () => {
  it("accepts a brief and keeps text verbatim", () => {
    const r = parseDirectedScript(s01());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.script.sections[0].videoPrompt).toBe(P);
    expect(r.script.sections[1].lines.map((l) => l.text)).toEqual(["Don't. Don't. Don't.", "I'm not gonna."]);
    expect(r.script.sections[2].endFrame).toEqual({ fromSection: 0 });
    expect(r.script.watermark).toBe(true);
    expect(directedRuntimeSec(r.script)).toBe(38); // overlay outro sits inside the body
  });

  it("reports every problem at once", () => {
    const bad = s01() as { sections: Record<string, unknown>[] };
    bad.sections[0].sec = 2;
    bad.sections[1].videoPrompt = "";
    bad.sections[2].model = "veo-3";
    const r = parseDirectedScript(bad);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects a loop end frame pointing at a section with no keyframe", () => {
    const bad = s01() as { sections: Record<string, unknown>[] };
    delete bad.sections[0].keyframePrompt;
    const r = parseDirectedScript(bad);
    expect(r.ok).toBe(false);
  });

  it("rejects a line outside its section", () => {
    const bad = s01() as { sections: { lines: { at: number }[] }[] };
    bad.sections[0].lines[0].at = 12;
    expect(parseDirectedScript(bad).ok).toBe(false);
  });
});

describe("compileDirectedEdd", () => {
  const script = (parseDirectedScript(s01()) as { script: DirectedScript }).script;
  const doc = compileDirectedEdd({
    script,
    sections: [
      { idx: 0, assetId: "c0", sourceSec: 10, isVideo: true },
      { idx: 1, assetId: "c1", sourceSec: 20, isVideo: true },
      { idx: 2, assetId: "c2", sourceSec: 8, isVideo: true },
    ],
    lines: [
      { sectionIdx: 0, lineIdx: 0, assetId: "l00", durationSec: 1.4, words: [{ w: "...Just", start: 0, end: 0.3 }, { w: "a", start: 0.3, end: 0.4 }, { w: "little", start: 0.4, end: 0.8 }, { w: "look.", start: 0.8, end: 1.3 }] },
      { sectionIdx: 1, lineIdx: 0, assetId: "l10", durationSec: 1.8, words: [{ w: "Don't.", start: 0, end: 0.5 }, { w: "Don't.", start: 0.6, end: 1.1 }, { w: "Don't.", start: 1.2, end: 1.7 }] },
      { sectionIdx: 1, lineIdx: 1, assetId: "l11", durationSec: 1.0, words: [{ w: "I'm", start: 0, end: 0.2 }, { w: "not", start: 0.2, end: 0.5 }, { w: "gonna.", start: 0.5, end: 0.9 }] },
    ],
    sfx: [{ sectionIdx: 1, cueIdx: 0, assetId: "sfx0" }],
    music: { assetId: "m0" },
    brand: { primary: "#FFB020" },
    channelName: "INKLIGHT",
  });

  it("uses the brief's seconds, not VO length", () => {
    expect(doc.tracks.video.map((c) => [c.start, c.duration])).toEqual([[0, 10], [10, 20], [30, 8]]);
    expect(doc.meta.targetDurationSec).toBe(38);
    expect(doc.meta.aspect).toBe("9:16");
    expect(doc.tracks.video[2].silent).toBe(true);
  });

  it("places lines, sfx and music at scripted offsets", () => {
    const vo = doc.tracks.audio.filter((a) => a.kind === "vo");
    expect(vo.map((a) => a.kind === "vo" && a.start)).toEqual([1.5, 14, 24]);
    const sfx = doc.tracks.audio.find((a) => a.kind === "sfx");
    expect(sfx && sfx.kind === "sfx" && sfx.at).toEqual({ kind: "abs", sec: 12 });
    expect(doc.tracks.audio.some((a) => a.kind === "music")).toBe(true);
    // Loop Short (overlay outro): the bed must not fade to silence at the loop point.
    const m = doc.tracks.audio.find((a) => a.kind === "music");
    expect(m && m.kind === "music" && m.fadeOutSec).toBe(0);
  });

  it("emphasizes highlight words and emits overlays", () => {
    const toks = doc.tracks.captions.flatMap((p) => p.tokens);
    expect(toks.filter((t) => t.emphasis === "color").map((t) => t.text)).toEqual(["Don't.", "Don't.", "Don't."]);
    const kinds = doc.tracks.overlays.map((o) => o.kind).sort();
    expect(kinds).toEqual(["endBeat", "label", "sting", "watermark"]);
  });

  it("lifts a Short's centre label off the centred captions it overlaps", () => {
    // "DO NOT PRESS" (0.5–9.5s, centre) overlaps the 1.5s caption page.
    const label = doc.tracks.overlays.find((o) => o.kind === "label");
    expect(label && label.kind === "label" && label.position).toBe("top");
  });

  it("validates against the directed context", () => {
    const assets = [
      ...["c0", "c1", "c2"].map((id, i) => ({ id, kind: "clip", meta: { durationSec: [10, 20, 8][i] } })),
      ...["l00", "l10", "l11"].map((id) => ({ id, kind: "vo", meta: { durationSec: 1.5 } })),
      { id: "sfx0", kind: "sfx", meta: {} },
      { id: "m0", kind: "bgm", meta: {} },
    ];
    const v = validateEdd(doc, buildDirectedEddContext(assets, script));
    expect(v.errors).toEqual([]);
  });
});

describe("snapZoomMotion", () => {
  it("builds a punch-in that returns to 1× and covers the clip", () => {
    const m = snapZoomMotion([{ at: 4.5 }], 10);
    expect(m.kind).toBe("keyframes");
    if (m.kind !== "keyframes") return;
    expect(m.points[0].t).toBe(0);
    expect(m.points.at(-1)!.t).toBe(10);
    expect(Math.max(...m.points.map((p) => p.scale))).toBeCloseTo(1.35);
  });
  it("drops a zoom that does not fit", () => {
    expect(snapZoomMotion([{ at: 9.5 }], 10).kind).toBe("none");
  });
});

describe("app directed helpers", async () => {
  const { directedClipSpec, estimateDirected, missingVoices } = await import("@/lib/pipeline/directed");
  const script = (parseDirectedScript(s01()) as { script: DirectedScript }).script;
  const assets = [
    { id: "k0", kind: "keyframe", beat_index: 0, storage_path: "videos/v/keyframe-0.png", meta: {} },
    { id: "k2", kind: "keyframe", beat_index: 2, storage_path: "videos/v/keyframe-2.png", meta: {} },
  ];

  it("builds a verbatim 9:16 spec with the loop end frame", () => {
    const spec = directedClipSpec(script, script.sections[2], assets, { genre: "action" }, "hf-seedance-2-5");
    expect(spec.prompt).toBe(P);
    expect(spec.aspect).toBe("9:16");
    expect(spec.keyframePath).toBe("videos/v/keyframe-2.png");
    expect(spec.endFramePath).toBe("videos/v/keyframe-0.png");
    expect(spec.controls).toBeUndefined(); // Cinema look never rides a Seedance request
  });

  it("merges cinema controls for Cinema Studio and hashes the spec", () => {
    const a = directedClipSpec(script, script.sections[0], assets, { genre: "action", bogus: "x" }, "hf-cinema-studio-4");
    const b = directedClipSpec(script, { ...script.sections[0], videoPrompt: "changed" }, assets, { genre: "action" }, "hf-cinema-studio-4");
    expect(a.controls).toEqual({ genre: "action" });
    expect(a.hash).not.toBe(b.hash);
  });

  it("estimates at the 720p rate and flags missing voices", () => {
    const e = estimateDirected(script);
    expect(e.generatedSec).toBe(38);
    expect(e.videoUsd).toBeCloseTo(38 * 0.4622, 2);
    expect(missingVoices(script, { voice_id: null, brand_kit: { voiceCast: { Pip: "v1" } } } as never)).toEqual([]);
    expect(missingVoices(script, { voice_id: null, brand_kit: {} } as never)).toEqual(["Pip"]);
  });
});

describe("pre-flight checks (batch 01 lessons)", async () => {
  const { directedWarnings, lineOverlaps } = await import("@studio/core");
  const script = (parseDirectedScript(s01()) as { script: DirectedScript }).script;

  it("flags a zoom that cannot finish inside its section", () => {
    const bad = JSON.parse(JSON.stringify(script)) as DirectedScript;
    bad.sections[1].zooms = [{ at: 19, toScale: 1.35, overSec: 0.2, holdSec: 0.6 }];
    expect(directedWarnings(bad).some((w) => w.includes("zoom at 19s"))).toBe(true);
    expect(directedWarnings(script).filter((w) => w.includes("zoom"))).toEqual([]);
  });

  it("finds dialogue that runs into the next line", () => {
    const ok = lineOverlaps(script, [
      { sectionIdx: 0, lineIdx: 0, durationSec: 2 },
      { sectionIdx: 1, lineIdx: 0, durationSec: 3 },
      { sectionIdx: 1, lineIdx: 1, durationSec: 1 },
    ]);
    expect(ok).toEqual([]);
    const bad = lineOverlaps(script, [
      { sectionIdx: 0, lineIdx: 0, durationSec: 2 },
      { sectionIdx: 1, lineIdx: 0, durationSec: 11 }, // 14s → 25s runs past the 24s line
      { sectionIdx: 1, lineIdx: 1, durationSec: 1 },
    ]);
    expect(bad).toEqual([{ sectionIdx: 1, lineIdx: 0, overlapSec: 1 }]);
  });
});

describe("resolution (spend lever)", async () => {
  const { estimateDirected } = await import("@/lib/pipeline/directed");
  it("parses 480p, rejects other values, and prices it at the 480p rate", () => {
    const raw = { ...(s01() as Record<string, unknown>), resolution: "480p" };
    const p = parseDirectedScript(raw);
    expect(p.ok && p.script.resolution).toBe("480p");
    const e = estimateDirected((p as { script: DirectedScript }).script);
    expect(e.videoUsd).toBeCloseTo(e.generatedSec * 0.2056, 2);
    expect(parseDirectedScript({ ...(s01() as Record<string, unknown>), resolution: "1080p" }).ok).toBe(false);
    const d = parseDirectedScript(s01());
    expect(d.ok && d.script.resolution).toBeUndefined();
  });
});

describe("chained segments (sections > 30s)", () => {
  const long = () => {
    const raw = s01() as { sections: Record<string, unknown>[] } & Record<string, unknown>;
    raw.sections[0] = { ...raw.sections[0], sec: 40 };
    return raw;
  };
  it("warns when a >30s section has no per-segment prompts", () => {
    const p = parseDirectedScript(long());
    expect(p.ok).toBe(true);
    expect(directedWarnings((p as { script: DirectedScript }).script).some((w) => w.includes("add `segments`"))).toBe(true);
  });
  it("accepts segments that sum to the section and rejects ones that don't", () => {
    const ok = long();
    ok.sections[0] = { ...ok.sections[0], segments: [{ sec: 20, prompt: "seg one" }, { sec: 20, prompt: "seg two" }] };
    const p = parseDirectedScript(ok);
    expect(p.ok && p.script.sections[0].segments?.map((g) => g.prompt)).toEqual(["seg one", "seg two"]);
    expect(directedWarnings((p as { script: DirectedScript }).script).some((w) => w.includes("add `segments`"))).toBe(false);
    const bad = long();
    bad.sections[0] = { ...bad.sections[0], segments: [{ sec: 20, prompt: "a" }, { sec: 15, prompt: "b" }] };
    const b = parseDirectedScript(bad);
    expect(b.ok).toBe(false);
    expect(!b.ok && b.errors.some((e) => e.includes("sum to 35"))).toBe(true);
  });
});

describe("reverse beats", () => {
  it("parses reverse and carries it only when set", () => {
    const raw = s01() as { sections: Record<string, unknown>[] } & Record<string, unknown>;
    raw.sections[1] = { ...raw.sections[1], reverse: true };
    const p = parseDirectedScript(raw);
    expect(p.ok && p.script.sections[1].reverse).toBe(true);
    expect(p.ok && p.script.sections[0].reverse).toBeUndefined();
  });
});

describe("section revisions (end frames)", async () => {
  const { applySectionRevisions } = await import("@/lib/pipeline/directed");
  const script = (parseDirectedScript(s01()) as { script: DirectedScript }).script;

  it("sets a prompted end frame and leaves the source script untouched", () => {
    const r = applySectionRevisions(script, [{ idx: 1, endFramePrompt: "  same stall, same apron  " }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.script.sections[1].endFrame).toEqual({ prompt: "same stall, same apron" });
    expect(script.sections[1].endFrame).toBeUndefined();
  });

  it("refuses to replace a loop end frame (it is another section's keyframe)", () => {
    const r = applySectionRevisions(script, [{ idx: 2, endFramePrompt: "new end" }]);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("section 0") });
  });

  it("rejects an unknown section", () => {
    expect(applySectionRevisions(script, [{ idx: 9, videoPrompt: "x" }]).ok).toBe(false);
  });

  it("replaces a section's labels", () => {
    const r = applySectionRevisions(script, [{ idx: 0, labels: [{ at: 1, durationSec: 3, text: "NEXT", position: "lower-third" }] }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.script.sections[0].labels).toEqual([expect.objectContaining({ text: "NEXT", position: "lower-third" })]);
    expect(script.sections[0].labels?.[0].text).toBe("DO NOT PRESS");
  });

  it("replaces a chained section's segment prompts, one per segment", () => {
    const raw = s01() as { sections: Record<string, unknown>[] } & Record<string, unknown>;
    raw.sections[1] = { ...raw.sections[1], sec: 45, segments: [{ sec: 30, prompt: "old A" }, { sec: 15, prompt: "old B" }] };
    const chained = (parseDirectedScript(raw) as { script: DirectedScript }).script;
    const r = applySectionRevisions(chained, [{ idx: 1, segmentPrompts: [" new A ", "new B"] }]);
    expect(r.ok && r.script.sections[1].segments).toEqual([{ sec: 30, prompt: "new A" }, { sec: 15, prompt: "new B" }]);
    expect(applySectionRevisions(chained, [{ idx: 1, segmentPrompts: ["only one"] }])).toEqual({ ok: false, error: expect.stringContaining("2 segments") });
    expect(applySectionRevisions(script, [{ idx: 0, segmentPrompts: ["x"] }])).toEqual({ ok: false, error: expect.stringContaining("no segments") });
  });
});

describe("relocateCaptionedCenterLabels", () => {
  const cap = [{ startMs: 2000, endMs: 4000 }];
  it("leaves a centre label alone when no caption is up", () => {
    const o = [{ kind: "label", startSec: 5, durationSec: 1, position: "center" }];
    relocateCaptionedCenterLabels(o, cap);
    expect(o[0].position).toBe("center");
  });
  it("uses the bottom band when a top label already holds that time", () => {
    const o = [
      { kind: "label", startSec: 0, durationSec: 10, position: "top" },
      { kind: "label", startSec: 3, durationSec: 2, position: "center" },
    ];
    relocateCaptionedCenterLabels(o, cap);
    expect(o.map((x) => x.position)).toEqual(["top", "bottom"]);
  });
});
