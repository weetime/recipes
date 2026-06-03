/**
 * Vendor the SGLang cookbook's generated model configs into upstream/sglang/.
 *
 * Sparse shallow-clones sgl-project/sgl-cookbook, copies only
 * data/models/generated/ into upstream/sglang/, and writes upstream/sglang.lock
 * pinning the commit. Re-run to refresh; review the diff before committing.
 *
 * Usage: node scripts/fetch-sglang-upstream.mjs [ref]
 *   ref defaults to the lock's ref if present, else the repo default branch.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const REPO = "sgl-project/sgl-cookbook";
const SUBDIR = "data/models/generated";
const ROOT = process.cwd();
const DEST = path.join(ROOT, "upstream", "sglang");
const LOCK = path.join(ROOT, "upstream", "sglang.lock");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
}

const lockRef = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")).ref : null;
const ref = process.argv[2] || lockRef || "";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sglang-vendor-"));
try {
  git(["clone", "--depth", "1", "--filter=blob:none", "--sparse",
       ...(ref ? ["--no-single-branch"] : []),
       `https://github.com/${REPO}.git`, tmp]);
  git(["sparse-checkout", "set", SUBDIR], tmp);
  if (ref) { git(["fetch", "--depth", "1", "origin", ref], tmp); git(["checkout", ref], tmp); }
  const sha = git(["rev-parse", "HEAD"], tmp);

  // Replace the vendored subtree wholesale so deletions upstream propagate.
  fs.rmSync(path.join(DEST, SUBDIR), { recursive: true, force: true });
  fs.mkdirSync(path.join(DEST, SUBDIR), { recursive: true });
  fs.cpSync(path.join(tmp, SUBDIR), path.join(DEST, SUBDIR), { recursive: true });

  fs.writeFileSync(LOCK, JSON.stringify({
    repo: REPO,
    ref: sha,
    subdir: SUBDIR,
    fetched_at: new Date().toISOString(),
  }, null, 2) + "\n");
  const files = fs.readdirSync(path.join(DEST, SUBDIR), { recursive: true })
    .filter((f) => String(f).endsWith(".yaml")).length;
  console.log(`✓ vendored ${REPO}@${sha.slice(0, 12)} — ${files} generated YAML files → upstream/sglang/${SUBDIR}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
