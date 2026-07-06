/**
 * Server-action contract manifest (UI-Redesign Phase 0).
 *
 * Parses every module in src/lib/actions and extracts the exported async
 * function signatures — the complete surface the UI is allowed to mutate the
 * pipeline through. The checked-in snapshot (action-manifest.json) is the
 * contract the redesign must preserve: tests/action-contract.test.ts fails on
 * any drift, so renames/signature changes are always a deliberate, reviewed
 * update via:
 *
 *   node tests/contracts/update-action-manifest.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ACTIONS_DIR = path.join(ROOT, "src/lib/actions");
export const MANIFEST_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "action-manifest.json",
);

/** module → ["name(param, list)", …] for every `export async function`. */
export function buildManifest() {
  const out = {};
  for (const f of fs.readdirSync(ACTIONS_DIR).sort()) {
    if (!f.endsWith(".ts")) continue;
    const src = fs.readFileSync(path.join(ACTIONS_DIR, f), "utf8");
    const sigs = [];
    const re = /export async function (\w+)\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      // Brace-match the parameter list (params can span lines / nest parens).
      let i = re.lastIndex;
      let depth = 1;
      let params = "";
      while (depth > 0 && i < src.length) {
        const c = src[i];
        if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) break;
        }
        params += c;
        i++;
      }
      sigs.push(`${m[1]}(${params.replace(/\s+/g, " ").trim()})`);
    }
    out[f.replace(/\.ts$/, "")] = sigs;
  }
  return out;
}

/** actionName → [importing files] across src/ (excluding the actions dir). */
export function buildCallerInventory() {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, "src"));

  const importers = {};
  for (const f of files) {
    if (f.startsWith(ACTIONS_DIR)) continue;
    const src = fs.readFileSync(f, "utf8");
    const re = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@\/lib\/actions\/(\w+)"/g;
    let m;
    while ((m = re.exec(src))) {
      for (let name of m[1].split(",")) {
        name = name.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        (importers[name] ??= []).push(path.relative(ROOT, f));
      }
    }
  }
  return importers;
}

// Run directly → rewrite the snapshot.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(buildManifest(), null, 2) + "\n");
  console.log(`wrote ${MANIFEST_PATH}`);
}
