// Dev helper: render a single frame of a Remotion composition to PNG so it can
// be eyeballed in a headless environment.
//   node scripts/shoot.mjs <CompositionId> <frame> <outPath>
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { fileURLToPath } from "node:url";

const id = process.argv[2] || "StickSheet";
const frame = Number(process.argv[3] ?? 15);
const out = process.argv[4] || `/tmp/${id}-${frame}.png`;

const entry = fileURLToPath(new URL("../src/index.ts", import.meta.url));
await ensureBrowser();
const serveUrl = await bundle({ entryPoint: entry });
const composition = await selectComposition({ serveUrl, id, inputProps: {} });
await renderStill({ composition, serveUrl, output: out, frame, inputProps: {}, overwrite: true });
console.log("wrote", out);
process.exit(0);
