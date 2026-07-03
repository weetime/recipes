/**
 * Vendor 新 SGLang cookbook 的结构化 config 到 upstream/sglang-configs/。
 * Sparse shallow-clone sgl-project/sglang,只取 docs_new/src/snippets/configs/,
 * 跳过 *-benchmarks.jsx,写 upstream/sglang-configs.lock 钉住 commit。
 * Usage: node scripts/fetch-sglang-configs.mjs [ref]
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const REPO = "sgl-project/sglang";
const SUBDIR = "docs_new/src/snippets/configs";
const ROOT = process.cwd();
const DEST = path.join(ROOT, "upstream", "sglang-configs");
const LOCK = path.join(ROOT, "upstream", "sglang-configs.lock");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
}

const lockRef = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")).ref : null;
const ref = process.argv[2] || lockRef || "";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sglang-configs-"));
try {
  git(["clone", "--depth", "1", "--filter=blob:none", "--sparse",
       ...(ref ? ["--no-single-branch"] : []),
       `https://github.com/${REPO}.git`, tmp]);
  git(["sparse-checkout", "set", SUBDIR], tmp);
  if (ref) { git(["fetch", "--depth", "1", "origin", ref], tmp); git(["checkout", ref], tmp); }
  const sha = git(["rev-parse", "HEAD"], tmp);

  fs.rmSync(path.join(DEST, SUBDIR), { recursive: true, force: true });
  fs.mkdirSync(path.join(DEST, SUBDIR), { recursive: true });
  // 只拷 config .jsx,跳过 benchmarks。
  const srcDir = path.join(tmp, SUBDIR);
  for (const rel of fs.readdirSync(srcDir, { recursive: true })) {
    const relStr = String(rel);
    if (!relStr.endsWith(".jsx") || relStr.endsWith("-benchmarks.jsx")) continue;
    const from = path.join(srcDir, relStr);
    if (!fs.statSync(from).isFile()) continue;
    const to = path.join(DEST, SUBDIR, relStr);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  fs.writeFileSync(LOCK, JSON.stringify({ repo: REPO, ref: sha, subdir: SUBDIR, fetched_at: new Date().toISOString() }, null, 2) + "\n");
  const n = fs.readdirSync(path.join(DEST, SUBDIR), { recursive: true }).filter((f) => String(f).endsWith(".jsx")).length;
  console.log(`✓ vendored ${REPO}@${sha.slice(0, 12)} — ${n} config JSX → upstream/sglang-configs/${SUBDIR}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
