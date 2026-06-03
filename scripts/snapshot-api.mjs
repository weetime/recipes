/**
 * Characterization snapshot of the generated JSON API.
 *
 * Walks public/ for every .json the build emits (excluding fetched assets),
 * hashes each file, and either writes the golden manifest (--write) or checks
 * the current output against it (default). Used to prove that refactors of the
 * command-synthesis / engine layer leave generated output byte-identical.
 *
 * Usage:
 *   node scripts/build-recipes-api.mjs        # regenerate public/*.json first
 *   node scripts/snapshot-api.mjs --write     # capture baseline → api-golden.json
 *   node scripts/snapshot-api.mjs             # check against baseline (exit 1 on diff)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PUBLIC = path.join(process.cwd(), "public");
const GOLDEN = path.join(process.cwd(), "scripts", "__tests__", "api-golden.json");

// public/ also holds build-time fetched assets (provider avatars, HF dates,
// platform logos) that this script does NOT generate — exclude them so the
// manifest reflects only command-synthesis output.
const EXCLUDE_DIRS = new Set(["providers", "platform-logos"]);
const EXCLUDE_FILES = new Set(["hf-dates.json"]);

function walk(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out.push(...walk(path.join(dir, e.name), base));
    } else if (e.name.endsWith(".json")) {
      const rel = path.relative(base, path.join(dir, e.name));
      if (!EXCLUDE_FILES.has(rel)) out.push(rel);
    }
  }
  return out;
}

function manifest() {
  const m = {};
  for (const rel of walk(PUBLIC).sort()) {
    const buf = fs.readFileSync(path.join(PUBLIC, rel));
    m[rel] = crypto.createHash("sha256").update(buf).digest("hex");
  }
  return m;
}

const current = manifest();

if (process.argv[2] === "--write") {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, JSON.stringify(current, null, 2) + "\n");
  console.log(`✓ wrote golden manifest: ${Object.keys(current).length} files`);
  process.exit(0);
}

if (!fs.existsSync(GOLDEN)) {
  console.error("✗ no golden manifest — run `node scripts/snapshot-api.mjs --write` first");
  process.exit(1);
}
const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
const diffs = [];
for (const k of [...new Set([...Object.keys(golden), ...Object.keys(current)])].sort()) {
  if (golden[k] !== current[k]) {
    diffs.push(`${!golden[k] ? "added" : !current[k] ? "removed" : "changed"}: ${k}`);
  }
}
if (diffs.length) {
  console.error(`✗ API output diverged from golden (${diffs.length} file(s)):`);
  for (const d of diffs.slice(0, 40)) console.error("  " + d);
  if (diffs.length > 40) console.error(`  … and ${diffs.length - 40} more`);
  process.exit(1);
}
console.log(`✓ API output matches golden (${Object.keys(current).length} files)`);
