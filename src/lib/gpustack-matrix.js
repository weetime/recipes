// Pure derivation of the GPUStack image-selector matrix from the vendored image
// lists. No `fs` — safe to import from the client component. Ported faithfully from
// the upstream app.js (parseSupportMatrix / renderFrameworkVersions / renderBackends
// / getFullImageName / generateImageList).

import { cardFrameworkMap, backendNameMap, registries, comments } from "./gpustack-images-config";

const BACKEND_TOKENS = ["vllm", "sglang", "mindie", "voxbox"];
const isBackendPart = (part) => !!part && BACKEND_TOKENS.some((b) => part.includes(b));

const runnerTag = (image) => image.replace("gpustack/runner:", "");
const runnerImagesOf = (images) => images.filter((i) => i.startsWith("gpustack/runner:"));

// Parse a runner tag like `cuda13.0-vllm0.22.1` or `cann8.5-910b-vllm0.18.0`.
// → { fw, fwver, chip, backend, bever, backendId } or null if it isn't a runner tag.
export function parseTag(tag) {
  const parts = tag.split("-");
  const m0 = parts[0].match(/^([a-z]+)([\d.]+)$/i);
  if (!m0) return null;
  const fw = m0[1].toLowerCase();
  const fwver = m0[2];
  // A middle segment that isn't an engine name (e.g. 910b / 310p / a3) is the chip.
  const hasChip = parts.length >= 3 && !isBackendPart(parts[1]);
  const chip = hasChip ? parts[1] : null;
  const backendPart = hasChip ? parts[2] : parts[1];
  const mb = backendPart ? backendPart.match(/^([a-z]+)([\d.]+(?:rc\d+)?(?:post\d+)?)?$/i) : null;
  const backend = mb ? mb[1].toLowerCase() : null;
  const bever = mb ? mb[2] : null;
  return { fw, fwver, chip, backend, bever, backendId: backend ? `${backend}-${bever}` : null };
}

// Map of framework → which versions have images. Used to enable/disable GPU cards
// and to populate the (non-Ascend) framework-version dropdown.
export function buildMatrix(images) {
  const frameworks = {};
  for (const img of runnerImagesOf(images)) {
    const p = parseTag(runnerTag(img));
    if (!p) continue;
    if (!frameworks[p.fw]) frameworks[p.fw] = { versions: new Set() };
    frameworks[p.fw].versions.add(p.fwver);
  }
  const out = {};
  for (const fw of Object.keys(frameworks)) {
    out[fw] = { versions: Array.from(frameworks[fw].versions) };
  }
  return { frameworks: out };
}

// True if the selected GPU card has any images for this version's matrix.
export function cardHasData(matrix, cardId) {
  const fw = (cardFrameworkMap[cardId] || "").toLowerCase();
  return !!matrix.frameworks[fw];
}

// Framework-version dropdown options for a card.
// Non-Ascend: [{ value, chip:null, label:"CUDA 13.0" }] sorted desc.
// Ascend (CANN): one option per (version, chip) combo, label "CANN 8.5 (910b)",
// sorted version-desc then 910b-first (matches upstream).
export function frameworkVersionsForCard(images, cardId) {
  const fwName = cardFrameworkMap[cardId];
  if (!fwName) return [];
  const fw = fwName.toLowerCase();

  if (cardId === "ascend") {
    const combos = new Map();
    for (const img of runnerImagesOf(images)) {
      const p = parseTag(runnerTag(img));
      if (!p || p.fw !== fw || !p.chip) continue;
      combos.set(`${p.fwver}-${p.chip}`, { v: p.fwver, c: p.chip });
    }
    return Array.from(combos.values())
      .sort((a, b) => {
        const vc = b.v.localeCompare(a.v, undefined, { numeric: true, sensitivity: "base" });
        if (vc !== 0) return vc;
        const a910 = a.c.toUpperCase().includes("910B");
        const b910 = b.c.toUpperCase().includes("910B");
        if (a910 && !b910) return -1;
        if (!a910 && b910) return 1;
        return b.c.localeCompare(a.c);
      })
      .map((item) => ({ value: item.v, chip: item.c, label: `${fwName} ${item.v} (${item.c})` }));
  }

  const versions = new Set();
  for (const img of runnerImagesOf(images)) {
    const p = parseTag(runnerTag(img));
    if (p && p.fw === fw) versions.add(p.fwver);
  }
  return Array.from(versions)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" }))
    .map((v) => ({ value: v, chip: null, label: `${fwName} ${v}` }));
}

// Inference-backend checkbox options for a (card, version, chip) selection.
// → [{ id:"vllm-0.22.1", label:"vLLM 0.22.1" }] sorted desc. Empty selection = all.
export function backendsForSelection(images, cardId, version, chip) {
  if (!version) return [];
  const fw = (cardFrameworkMap[cardId] || "").toLowerCase();
  const options = new Map();
  for (const img of runnerImagesOf(images)) {
    const p = parseTag(runnerTag(img));
    if (!p || p.fw !== fw || p.fwver !== version || !p.backendId) continue;
    if (cardId === "ascend" && p.chip !== chip) continue;
    options.set(p.backendId, `${backendNameMap[p.backend] || p.backend} ${p.bever ?? ""}`.trim());
  }
  return Array.from(options.entries())
    .sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true, sensitivity: "base" }))
    .map(([id, label]) => ({ id, label }));
}

// Apply registry prefix + per-base overrides. `baseName` is the short image name
// (last path segment), e.g. "gpustack", "runner", "postgres".
export function getFullImageName(baseName, tag, registryKey) {
  const reg = registries[registryKey] || registries["docker-hub"];
  let p = `${reg.prefix}${baseName}`;
  if (reg.overrides && reg.overrides[baseName]) p = reg.overrides[baseName];
  return `${p}:${tag}`;
}

// Build the full `docker pull` command list as a string. Comment lines start with
// `#` (the component dims them); blank lines separate groups. Filtered by the
// selected node component (all / server / worker).
export function generateImageList(state, images, gpustackVersion) {
  const { card, frameworkVersion, chipType, backends, optional, arch, registry, component } = state;
  const plat = arch === "auto" ? "" : ` --platform linux/${arch}`;
  const isServer = component === "server" || component === "all";
  const isWorker = component === "worker" || component === "all";
  const pull = (full) => `docker pull${plat} ${full}`;
  const lines = [];

  if (gpustackVersion) {
    lines.push(`# ${comments.main}`);
    lines.push(pull(getFullImageName("gpustack", gpustackVersion, registry)));
  }

  if (!card || !frameworkVersion) return lines.join("\n");

  const fw = (cardFrameworkMap[card] || "").toLowerCase();

  if (isWorker) {
    const rCmds = [];
    for (const img of runnerImagesOf(images)) {
      const tag = runnerTag(img);
      const p = parseTag(tag);
      if (!p || p.fw !== fw || p.fwver !== frameworkVersion) continue;
      if (card === "ascend" && chipType && p.chip !== chipType) continue;
      if (backends.length > 0 && (!p.backendId || !backends.includes(p.backendId))) continue;
      rCmds.push(pull(getFullImageName("runner", tag, registry)));
    }
    if (rCmds.length) lines.push("", `# ${comments.runner}`, ...rCmds);

    const pause = images.find((i) => i.includes("runtime:pause"));
    if (pause) lines.push("", `# ${comments.pause}`, pull(getFullImageName("runtime", pause.split(":")[1], registry)));

    const bm = images.find((i) => i.includes("benchmark-runner"));
    if (bm) lines.push("", `# ${comments.benchmark}`, pull(getFullImageName("benchmark-runner", bm.split(":")[1], registry)));
  }

  if (isServer) {
    if (optional.includes("postgres")) {
      const pgs = images.filter((i) => i.startsWith("postgres:"));
      if (pgs.length) {
        lines.push("", `# ${comments.postgres}`);
        for (const i of pgs) lines.push(pull(getFullImageName("postgres", i.split(":")[1], registry)));
      }
    }
    if (optional.includes("monitoring")) {
      const proms = images.filter((i) => i.includes("prometheus"));
      const grafs = images.filter((i) => i.includes("grafana"));
      if (proms.length || grafs.length) {
        lines.push("", `# ${comments.monitoring}`);
        for (const i of proms) lines.push(pull(getFullImageName("prometheus", i.split(":")[1], registry)));
        for (const i of grafs) lines.push(pull(getFullImageName("grafana", i.split(":")[1], registry)));
      }
    }
    // Gateway / GPU-service images — only required for Kubernetes deployments.
    const k8s = images.filter((img) => {
      const name = img.split(":")[0];
      return (
        name.startsWith("gpustack/mirrored-") ||
        ["gpustack/higress-plugins", "gpustack/gpustack-operator", "gpustack/ssh-server"].includes(name)
      );
    });
    if (k8s.length) {
      lines.push("", `# ${comments.gateway}`);
      for (const img of k8s) {
        const [fullName, tag] = img.split(":");
        lines.push(pull(getFullImageName(fullName.split("/").pop(), tag, registry)));
      }
    }
  }

  return lines.join("\n");
}
