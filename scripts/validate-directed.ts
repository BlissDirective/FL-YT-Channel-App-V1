/**
 * Free pre-flight for a directed script file (no network, no spend):
 *   pnpm exec tsx scripts/validate-directed.ts <file.json> [...more]
 * Prints parse errors, directedWarnings, generated seconds and the Higgsfield
 * video cost at the script's resolution. Exit 1 on any error or warning.
 */
import { readFileSync } from "node:fs";
import { directedBodySec, directedRuntimeSec, directedWarnings, HF_USD_PER_SEC, parseDirectedScript } from "@studio/core";

const WPM = 169; // measured narrator pace (lessons Q2)
let bad = false;
for (const file of process.argv.slice(2)) {
  const parsed = parseDirectedScript(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.ok) {
    bad = true;
    console.log(`✗ ${file}\n  ${parsed.errors.join("\n  ")}`);
    continue;
  }
  const s = parsed.script;
  const warnings = directedWarnings(s);
  // Dialogue fit at 169 wpm on the global timeline: a line may run on into a
  // following silent section, but must finish before the next line starts.
  let t0 = 0;
  const lines: { sec: number; i: number; start: number; dur: number }[] = [];
  for (const sec of s.sections) {
    sec.lines.forEach((l, i) => lines.push({ sec: sec.idx + 1, i: i + 1, start: t0 + l.at, dur: (l.text.split(/\s+/).filter(Boolean).length / WPM) * 60 }));
    t0 += sec.sec;
  }
  lines.forEach((l, k) => {
    const next = lines[k + 1]?.start ?? t0;
    if (l.start + l.dur > next - 0.15) warnings.push(`section ${l.sec}: line ${l.i} needs ~${l.dur.toFixed(1)}s but only ${(next - l.start).toFixed(1)}s until the next line/end`);
  });
  const res = s.resolution ?? "720p";
  const gen = directedBodySec({ sections: s.sections.filter((x) => !x.reuse) });
  const usd = gen * HF_USD_PER_SEC[res];
  if (warnings.length) bad = true;
  console.log(`${warnings.length ? "⚠" : "✓"} ${file} — ${s.format} ${res}, ${s.sections.length} sections, runtime ${directedRuntimeSec(s)}s, generated ${gen}s → $${usd.toFixed(2)}`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
process.exit(bad ? 1 : 0);
