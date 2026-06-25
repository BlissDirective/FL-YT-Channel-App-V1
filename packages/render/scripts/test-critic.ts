// Functional check: render keyframe stills + run the (mock) vision critic.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { critiqueStickFrames, type CritiqueFrame } from "../src/stick/frame-critic";

async function main() {
  const entry = fileURLToPath(new URL("../src/index.ts", import.meta.url));
  await ensureBrowser();
  const serveUrl = await bundle({ entryPoint: entry });
  const composition = await selectComposition({ serveUrl, id: "StickShortSample", inputProps: {} });

  const outDir = mkdtempSync(join(tmpdir(), "critic-test-"));
  const frames: CritiqueFrame[] = [];
  const samples = [20, 110, 210];
  for (let i = 0; i < samples.length; i++) {
    const out = join(outDir, `kf-${i}.jpg`);
    await renderStill({ composition, serveUrl, output: out, frame: samples[i], imageFormat: "jpeg", jpegQuality: 80 });
    frames.push({
      beatIdx: i,
      jpegBase64: readFileSync(out).toString("base64"),
      action: ["walk", "lookAround", "run"][i],
      setting: "forest",
      text: "sample",
    });
  }
  console.log(`rendered ${frames.length} keyframes; base64 sizes:`, frames.map((f) => f.jpegBase64.length));

  const critique = await critiqueStickFrames({ title: "Alone in the Woods", frames });
  console.log("critique:", JSON.stringify(critique, null, 2));

  const ok =
    typeof critique.score === "number" &&
    Boolean(critique.scores) &&
    Array.isArray(critique.issues) &&
    Array.isArray(critique.strengths) &&
    frames.every((f) => f.jpegBase64.length > 1000);
  console.log(ok ? "ALL PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main();
