/**
 * EDD visual smoke harness — audit A8 layer 2 (per-capability render check).
 * Renders a hand-authored document that exercises every EDD capability with
 * NO external assets (data-URI stills + the branded fallback card): explicit
 * clip timing, a sub-1s clip, kenburns/keyframe motion, crossfade / slide /
 * dipToBlack / whip transitions, caption pages with all four emphasis kinds,
 * a lower-third, a progress bar. Produces stills at capability-critical
 * frames plus a short encoded range, then sanity-checks the outputs exist and
 * are non-trivial.
 *
 * Run:  pnpm --filter @studio/render edd-smoke
 * Env:  BROWSER_EXECUTABLE — optional Chromium path (defaults to Remotion's
 *       managed browser; CI downloads it, sandboxes point at a local one).
 */
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { EditDocument } from "@studio/core";
import type { EddPayload, VideoProps } from "./types";

/** 4x4 solid-color PNGs (pre-encoded) so clips have real image sources. */
const PNG = {
  red: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGP8z8DwnwEJMDFgAG5+AlMEV6JkAAAAAElFTkSuQmCC",
  blue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFUlEQVR4nGNkYPj/n4EBAZgYMAA3PwEyfgFTPCUS4wAAAABJRU5ErkJggg==",
};

function smokeDoc(): { doc: EditDocument; payload: EddPayload } {
  const doc: EditDocument = {
    meta: { schemaVersion: 1, format: "long", fps: 30, aspect: "16:9", targetDurationSec: 18.4 },
    intro: { sting: true, sec: 3 },
    outro: { endCard: true, sec: 4 },
    tracks: {
      video: [
        {
          id: "v1",
          beatIdx: 0,
          assetId: "a-red",
          source: "still",
          start: 3,
          duration: 4,
          trim: { in: 0, out: 4 },
          motion: { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" },
          transitionOut: { kind: "crossfade", sec: 0.5 },
        },
        {
          id: "v2",
          beatIdx: 1,
          assetId: "a-blue",
          source: "still",
          start: 7,
          duration: 1, // the legacy 1s floor case
          trim: { in: 0, out: 1 },
          motion: {
            kind: "keyframes",
            points: [
              { t: 0, scale: 1.12, x: 3, y: 0, ease: "linear" },
              { t: 1, scale: 1.12, x: -3, y: 0, ease: "linear" },
            ],
          },
          transitionOut: { kind: "slide", sec: 0.4, dir: "left" },
        },
        {
          id: "v3",
          beatIdx: 2,
          assetId: null, // fallback card path
          source: "still",
          start: 8,
          duration: 3.4,
          trim: { in: 0, out: 3.4 },
          motion: { kind: "none" },
          transitionOut: { kind: "dipToBlack", sec: 0.8 },
        },
        {
          id: "v4",
          beatIdx: 3,
          assetId: "a-red",
          source: "still",
          start: 11.4,
          duration: 3,
          trim: { in: 0, out: 3 },
          motion: { kind: "kenburns", fromScale: 1.12, toScale: 1.02, anchor: "top" },
          transitionOut: { kind: "cut" },
        },
      ],
      audio: [], // no VO/SFX assets in the sandbox; audio is covered by unit tests
      captions: [
        {
          startMs: 3200,
          endMs: 6800,
          style: "clean",
          position: "bottom",
          tokens: [
            { text: "plain", fromMs: 3200, toMs: 4000, emphasis: "none" },
            { text: "POP", fromMs: 4000, toMs: 4800, emphasis: "pop" },
            { text: "color", fromMs: 4800, toMs: 5600, emphasis: "color" },
            { text: "shake", fromMs: 5600, toMs: 6200, emphasis: "shake" },
            { text: "scale", fromMs: 6200, toMs: 6800, emphasis: "scale" },
          ],
        },
      ],
      overlays: [
        {
          kind: "highlight",
          text: "BIG MOMENT",
          startMs: 8400,
          endMs: 10400,
          style: "word-pop",
          anchor: { kind: "abs", sec: 8.4 },
        },
        { kind: "lowerThird", text: "Custom CTA", sub: "with a sub line", startSec: 12, durationSec: 2 },
        { kind: "progressBar", style: "bar" },
      ],
    },
  };
  const payload: EddPayload = {
    version: 1,
    doc,
    media: {
      "a-red": { imageUrl: PNG.red },
      "a-blue": { imageUrl: PNG.blue },
    },
    audio: {},
    sfxLibrary: {},
    beatText: { 2: "Fallback headline beat" },
  };
  return { doc, payload };
}

async function main() {
  const { payload } = smokeDoc();
  const props: VideoProps = {
    title: "EDD Smoke",
    projectName: "Studio",
    brand: { primary: "#F5B829", secondary: "#17150F" },
    beats: [],
    captions: true,
    introPhrase: "EDD SMOKE TEST",
    edd: payload,
  };

  const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
  if (!browserExecutable) await ensureBrowser();

  console.log("bundling…");
  const serveUrl = await bundle({ entryPoint: fileURLToPath(new URL("./index.ts", import.meta.url)) });
  const composition = await selectComposition({
    serveUrl,
    id: "LongForm",
    inputProps: props,
    browserExecutable,
  });
  const expectFrames = Math.round(18.4 * 30);
  if (composition.durationInFrames !== expectFrames) {
    throw new Error(`duration ${composition.durationInFrames} ≠ expected ${expectFrames} (EDD-aware calculateMetadata broken)`);
  }

  const outDir = mkdtempSync(join(tmpdir(), "edd-smoke-"));
  // Capability-critical frames: intro, kenburns mid-clip, mid-crossfade,
  // keyframe pan, caption emphasis, fallback card, dip-to-black boundary,
  // custom lower-third, end card.
  const stills: [string, number][] = [
    ["intro", 45],
    ["kenburns+captions", 130],
    ["crossfade-mid", Math.round(7.25 * 30)],
    ["keyframe-pan", Math.round(7.6 * 30)],
    ["fallback+highlight", Math.round(8.5 * 30)],
    ["dip-boundary", Math.round(11.4 * 30)],
    ["lower-third", Math.round(12.5 * 30)],
    ["endcard", Math.round(16 * 30)],
  ];
  for (const [name, frame] of stills) {
    const output = join(outDir, `${name}.png`);
    await renderStill({ composition, serveUrl, output, inputProps: props, frame, browserExecutable });
    const size = statSync(output).size;
    if (size < 1000) throw new Error(`still ${name} suspiciously small (${size}B)`);
    console.log(`✓ still ${name} @${frame} (${Math.round(size / 1024)}KB)`);
  }

  // A short encoded range across the crossfade boundary.
  const clipOut = join(outDir, "range.mp4");
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: clipOut,
    inputProps: props,
    frameRange: [Math.round(6.5 * 30), Math.round(8 * 30)],
    timeoutInMilliseconds: 120000,
    browserExecutable,
    imageFormat: "jpeg",
    jpegQuality: 80,
    crf: 26,
    x264Preset: "veryfast",
  });
  const clipSize = readFileSync(clipOut).length;
  if (clipSize < 5000) throw new Error(`range render suspiciously small (${clipSize}B)`);
  console.log(`✓ encoded range across crossfade (${Math.round(clipSize / 1024)}KB)`);
  console.log(`\nEDD smoke PASSED — outputs in ${outDir}`);
}

main().catch((err) => {
  console.error("EDD smoke FAILED:", err);
  process.exit(1);
});
