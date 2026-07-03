/**
 * Pure mapping from sgl-cookbook generated model configs to our engines/sglang
 * block schema. No IO — scripts/sync-sglang.mjs does the reading/writing.
 *
 * Scope: TP only. Uses each hardware's `default` named configuration;
 * dp/ep/PD/speculative (non-default) configs are ignored. Multi-node is NOT
 * encoded here — the SGLang adapter derives it at render time from
 * tp_by_hardware vs the hardware's gpu_count.
 */

/**
 * 求值一个 SGLang 新 cookbook 的 config 模块文本 → 其 `config` 对象。
 * 这些模块是纯数据(对象内部不引用任何 import),但带行内注释和模板字符串,
 * 所以用一个受限的 Function 求值,而不是正则硬抠。
 */
export function parseConfigModule(source) {
  const noImports = String(source).replace(/^\s*import\s.*$/gm, "");
  // 把 `export const config =` 改成 `return`,并去掉任何其它顶层 export。
  const body = noImports
    .replace(/export\s+const\s+config\s*=/, "return ")
    .replace(/^\s*export\s+.*$/gm, "");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict";\n${body}`);
  return fn();
}

// 已知量化后缀:从 cookbookModel 推基准 recipe hf_id 时剥离。
const QUANT_SUFFIXES = ["-FP8", "-NVFP4", "-MXFP8", "-MXFP4", "-INT8", "-INT4", "-AWQ", "-GPTQ"];

export function hfIdForConfig(config) {
  let id = config?.github?.cookbookModel || "";
  for (const suf of QUANT_SUFFIXES) {
    if (id.endsWith(suf)) { id = id.slice(0, -suf.length); break; }
  }
  return id;
}

// cell.flags 每个元素是整条 "--flag value" 字符串。
function tpFromCell(cell) {
  for (const f of cell?.flags || []) {
    const m = /^--tp\s+(\d+)/.exec(f);
    if (m) return Number(m[1]);
  }
  return null;
}

// 给某硬件挑一条代表 cell:优先 bf16 + single/首个 strategy,回退该 hw 的第一条。
function pickCell(config, hw) {
  const cells = (config.cells || []).filter((c) => c?.match?.hw === hw);
  return cells.find((c) => c.match?.quant === "bf16") || cells[0] || null;
}

// 所有 cell 共有、且非 model-path/host/port/tp/parser 的整条 flag → base_args。
function commonBaseArgs(config) {
  const cells = config.cells || [];
  if (!cells.length) return ["--trust-remote-code"];
  const EXCLUDE = /^--(model-path|host|port|tp|reasoning-parser|tool-call-parser)\b/;
  const sets = cells.map((c) => new Set((c.flags || []).filter((f) => !EXCLUDE.test(f))));
  const [first, ...rest] = sets;
  const common = [...first].filter((f) => rest.every((s) => s.has(f)));
  return common.length ? common : ["--trust-remote-code"];
}

export function configToBlock(config, hfId, recipePrecision, taxonomyHwIds) {
  const modelId = config.modelNames?.["default|bf16"] || config.github?.cookbookModel || hfId;

  const tp_by_hardware = {};
  for (const hw of config.supportedHardware || []) {
    if (taxonomyHwIds && !taxonomyHwIds.has(hw)) continue; // 未知硬件跳过
    const tp = tpFromCell(pickCell(config, hw));
    if (tp != null) tp_by_hardware[hw] = tp;
  }

  const features = {};
  for (const item of config.playgroundFeatures?.parsers?.items || []) {
    const parts = String(item.flag || "").trim().split(/\s+/);
    if (parts[0] === "--tool-call-parser") features.tool_calling = { args: parts };
    else if (parts[0] === "--reasoning-parser") features.reasoning = { args: parts };
  }

  const block = {
    engine: "sglang",
    model_id: modelId,
    nightly_required: true,
    serve_binary: "python3 -m sglang.launch_server",
    base_args: commonBaseArgs(config),
    tp_by_hardware,
    variants: { default: {} },
    strategies: { single_node_tp: {} },
    features,
  };

  const precision = recipePrecision || config.quantizations?.[0]?.id || null;
  if (precision) block.variants.default.precision = precision;
  return block;
}
