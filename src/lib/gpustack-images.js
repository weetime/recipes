import fs from "fs";
import path from "path";

// Reads the vendored GPUStack image-selector data (data/gpustack-images/) once per
// process — server-only (uses fs). The flat per-version image lists are passed to
// the client <ImageSelector>, which derives the GPU/framework/backend matrix via
// src/lib/gpustack-matrix.js. Refresh the vendored files with
// `node scripts/fetch-gpustack-images.mjs`.
let cache = null;

const DATA_DIR = path.join(process.cwd(), "data", "gpustack-images");

export function loadGpuStackImages() {
  if (cache) return cache;

  const index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8"));
  const versions = index.versions || index;

  const imagesByVersion = {};
  for (const v of versions) {
    const file = path.join(DATA_DIR, `${v}.json`);
    if (fs.existsSync(file)) imagesByVersion[v] = JSON.parse(fs.readFileSync(file, "utf8"));
  }

  let fetchedAt = null;
  const sourceFile = path.join(DATA_DIR, "source.json");
  if (fs.existsSync(sourceFile)) {
    try {
      fetchedAt = JSON.parse(fs.readFileSync(sourceFile, "utf8")).fetched_at || null;
    } catch {}
  }

  cache = { versions: versions.filter((v) => imagesByVersion[v]), imagesByVersion, fetchedAt };
  return cache;
}
