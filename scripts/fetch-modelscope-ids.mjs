/**
 * Build-time: resolve each recipe's HuggingFace id to its real ModelScope id.
 *
 * The site used to link to `modelscope.cn/models/<hf_org>/<hf_repo>` directly,
 * which assumes ModelScope mirrors HF's org/repo naming. That is often false
 * (e.g. meta-llama/Llama-3.1-8B-Instruct -> LLM-Research/Meta-Llama-3.1-8B-Instruct,
 * openai/gpt-oss-120b -> openai-mirror/gpt-oss-120b), and many recipes have no
 * ModelScope mirror at all -> 404.
 *
 * This resolves via the ModelScope REST API:
 *   1. exact id check: GET /api/v1/models/<org>/<repo>  (Code 200 = exists)
 *   2. fallback search: PUT /api/v1/dolphin/models, accept a candidate whose
 *      repo name matches (exact, or differs only by an org-ish prefix like
 *      "Meta-"). Suffix variants (GGUF/AWQ/INT4/...) are excluded automatically
 *      because they don't equal/endWith the HF repo.
 *
 * Output: a committed manifest `modelscope-ids.json` (hf_id -> modelscope_id),
 * containing only resolved entries. recipes.js attaches it as recipe.modelscope_id;
 * the detail page shows the ModelScope link only when an entry exists.
 *
 * Cached between builds (merges existing manifest). Pass --force to re-resolve all.
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "modelscope-ids.json");
const API = "https://modelscope.cn/api/v1";
const FORCE = process.argv.includes("--force");

function findYamlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findYamlFiles(full));
    else if (e.name.endsWith(".yaml") || e.name.endsWith(".yml")) out.push(full);
  }
  return out;
}

// Normalize a repo name for tolerant comparison: lowercase, drop non-alphanumerics.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function api(url, opts = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { "User-Agent": "vllm-recipes-build/1.0", ...(opts.headers || {}) },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 404) return { status: 404 };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { status: 200, body: await res.json() };
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return { status: 0 };
}

// Community re-uploaders / quant mirrors. We don't link to these — an official
// recipe site shouldn't point users at an unofficial mirror. If only a reuploader
// matches, the model is treated as having no ModelScope presence (link hidden).
const REUPLOADER = /^(unsloth|second-state|bartowski|mradermacher|quantfactory|lmstudio-community)$/i;

// 1. exact id check (also serves as the reachability verifier)
async function existsExact(org, repo) {
  const r = await api(`${API}/models/${org}/${repo}`);
  return r.status === 200;
}

// 2. search fallback — return a matching, VERIFIED-reachable modelscope id or null.
// The search index can contain stale/wrong rows, so every candidate is re-checked
// with an exact GET before being accepted.
async function searchMatch(repo) {
  const r = await api(`${API}/dolphin/models`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Name: repo, PageSize: 15, PageNumber: 1, SortBy: "Default" }),
  });
  if (r.status !== 200) return null;
  const models = r.body?.Data?.Model?.Models || [];
  const target = norm(repo);

  const candidates = [];
  for (const m of models) {
    const candPath = m.Path || m.Namespace || m.GroupName;
    const candName = m.Name;
    if (!candPath || !candName) continue;
    const c = norm(candName);
    // exact, or candidate name is HF repo with an org-ish prefix (Meta-Llama vs Llama).
    // endsWith excludes suffix variants (GGUF/AWQ/INT4) since those don't end with repo.
    const exact = c === target;
    if ((exact || c.endsWith(target)) && !REUPLOADER.test(candPath)) {
      candidates.push({ id: `${candPath}/${candName}`, exact });
    }
  }
  // Prefer exact name match, preserving search order otherwise.
  candidates.sort((a, b) => b.exact - a.exact);

  for (const cand of candidates) {
    const [o, n] = cand.id.split("/");
    if (await existsExact(o, n)) return cand.id; // verify reachable before accepting
  }
  return null;
}

async function resolve(hfId) {
  const [org, repo] = hfId.split("/");
  if (await existsExact(org, repo)) return hfId;
  return await searchMatch(repo);
}

const files = findYamlFiles(path.join(ROOT, "models"));
const hfIds = files.map((f) => {
  const rel = path.relative(path.join(ROOT, "models"), f);
  const parts = rel.split(path.sep);
  const repo = parts[parts.length - 1].replace(/\.(yaml|yml)$/, "");
  return `${parts[0]}/${repo}`;
});

// Load existing manifest (cache of resolved ids). Absent ids are NOT persisted,
// so every build retries them — self-healing network flakes and catching mirrors
// that get published later.
let manifest = {};
if (fs.existsSync(MANIFEST) && !FORCE) {
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch {}
}

let resolved = 0, cached = 0, absent = 0;
const out = {};
for (const id of hfIds) {
  if (!FORCE && manifest[id]) {
    out[id] = manifest[id];
    resolved++;
    cached++;
    continue;
  }
  const ms = await resolve(id);
  if (ms) { out[id] = ms; resolved++; }
  else { absent++; }
  await new Promise((r) => setTimeout(r, 120));
}

// Persist resolved ids only (sorted for stable diffs). Drop ids no longer in the set.
const persisted = {};
for (const id of Object.keys(out).sort()) persisted[id] = out[id];
fs.writeFileSync(MANIFEST, JSON.stringify(persisted, null, 2) + "\n");

console.log(
  `✓ ModelScope ids: ${resolved} resolved, ${absent} absent, ${cached} from cache (${hfIds.length} total)`
);
