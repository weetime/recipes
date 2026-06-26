/**
 * Build-time: vendor the GPUStack "Container Image Selector" data into the repo.
 *
 * The upstream page (https://docs.gpustack.ai/latest/image-selector/) is a static
 * SPA that fetches plain JSON:
 *   - versions/index.json   → { versions: ["v2.2.0", ...] }
 *   - versions/<v>.json     → flat array of full image refs (gpustack/runner:cuda13.0-vllm0.22.1, ...)
 *
 * We mirror those files into data/gpustack-images/ (committed to git) so the site
 * builds without a runtime dependency on docs.gpustack.ai. The GPU-type → framework
 * → backend matrix is DERIVED from the runner image tags at render time
 * (see src/lib/gpustack-matrix.js) — exactly like the upstream app.js does.
 *
 * Fail-soft: if the network is unavailable, keep the existing vendored files and
 * warn, so `pnpm build` never breaks offline. Re-run any time to refresh:
 *   node scripts/fetch-gpustack-images.mjs
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "gpustack-images");
const BASE_URL = "https://docs.gpustack.ai/latest/image-selector/versions";

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "vllm-recipes-build/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let index;
  try {
    index = await fetchJson(`${BASE_URL}/index.json`);
  } catch (err) {
    console.warn(`⚠ GPUStack images: could not fetch index.json (${err.message}). Keeping existing vendored files.`);
    return;
  }

  const versions = index.versions || index;
  if (!Array.isArray(versions) || versions.length === 0) {
    console.warn("⚠ GPUStack images: index.json had no versions. Keeping existing vendored files.");
    return;
  }

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ versions }, null, 2) + "\n");

  let fetched = 0, failed = 0;
  for (const v of versions) {
    try {
      const images = await fetchJson(`${BASE_URL}/${v}.json`);
      fs.writeFileSync(path.join(OUT_DIR, `${v}.json`), JSON.stringify(images, null, 2) + "\n");
      fetched++;
    } catch (err) {
      console.warn(`⚠ GPUStack images: failed to fetch ${v}.json (${err.message}). Keeping existing file if present.`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  // Provenance (mirrors the upstream/sglang.lock convention).
  fs.writeFileSync(
    path.join(OUT_DIR, "source.json"),
    JSON.stringify({ source: BASE_URL, fetched_at: new Date().toISOString(), versions }, null, 2) + "\n",
  );

  console.log(`✓ GPUStack images: ${fetched} versions fetched, ${failed} failed (${versions.length} total)`);
}

main();
