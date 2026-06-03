/**
 * Pure mapping from sgl-cookbook generated model configs to our engines/sglang
 * block schema. No IO — scripts/sync-sglang.mjs does the reading/writing.
 *
 * P2a scope: TP only. Uses each hardware's `default` named configuration;
 * dp/ep/PD/speculative (non-default) configs are ignored.
 */

// Upstream hardware name → our taxonomy.yaml hardware id. Names not listed are
// skipped (their tp is dropped) — sync-sglang.mjs logs a warning.
export const HW_NAME_MAP = {
  H100: "h100", H200: "h200",
  B200: "b200", B300: "b300",
  GB200: "gb200", GB300: "gb300",
  MI300X: "mi300x", MI325X: "mi325x", MI355X: "mi355x",
};

// Multi-node TP flag template; {NNODES}/{RANK} are filled by the sglang adapter.
const MULTI_NODE_EXTRA = ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"];

// Numeric semver-ish compare for "v0.5.10" style tags (so v0.5.10 > v0.5.8).
export function compareVersions(a, b) {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// One upstream model → one block. Single `default` variant (quantized siblings
// are separate upstream models with their own model_path).
export function modelToBlock(model, version) {
  const block = {
    engine: "sglang",
    model_id: model.model_path,
    min_version: version,
    serve_binary: "python3 -m sglang.launch_server",
    base_args: ["--trust-remote-code"],
    tp_by_hardware: {},
    variants: { default: {} },
    strategies: { single_node_tp: {} },
    features: {},
  };

  let precision = null;
  let hasMulti = false;
  for (const [hwName, hwCfg] of Object.entries(model.hardware || {})) {
    const taxoId = HW_NAME_MAP[hwName];
    const configs = hwCfg?.configurations || [];
    // Prefer an exact "default" config; some models name them "default-kv-fp8"
    // etc., so fall back to the first "default"-prefixed config.
    const def = configs.find((c) => c && c.name === "default")
      || configs.find((c) => c && typeof c.name === "string" && c.name.startsWith("default"));
    if (def) {
      if (taxoId && def.engine?.tp != null) block.tp_by_hardware[taxoId] = def.engine.tp;
      if (!precision && def.attributes?.quantization) precision = def.attributes.quantization;
    }
    if (configs.some((c) => c?.attributes?.nodes === "multi")) hasMulti = true;
  }
  if (precision) block.variants.default.precision = precision;
  if (hasMulti) block.strategies.multi_node_tp = { extra: MULTI_NODE_EXTRA };

  const llm = model.attributes?.llm || {};
  if (llm.tool_parser) block.features.tool_calling = { args: ["--tool-call-parser", llm.tool_parser] };
  if (llm.reasoning_parser) block.features.reasoning = { args: ["--reasoning-parser", llm.reasoning_parser] };

  return block;
}

/**
 * @param {{versionDocs: {version:string, doc:any}[], recipeHfIds: Set<string>}} input
 * @returns {{blocks: {hfId:string, block:any}[], skipped: string[]}}
 */
export function transform({ versionDocs, recipeHfIds }) {
  const byPath = new Map();
  for (const { version, doc } of versionDocs) {
    for (const fam of doc?.families || []) {
      for (const model of fam?.models || []) {
        if (!model?.model_path) continue;
        const prev = byPath.get(model.model_path);
        if (!prev || compareVersions(version, prev.version) > 0) {
          byPath.set(model.model_path, { model, version });
        }
      }
    }
  }
  const blocks = [];
  const skipped = [];
  for (const [modelPath, { model, version }] of byPath) {
    if (!recipeHfIds.has(modelPath)) { skipped.push(modelPath); continue; }
    blocks.push({ hfId: modelPath, block: modelToBlock(model, version) });
  }
  skipped.sort();
  return { blocks, skipped };
}
