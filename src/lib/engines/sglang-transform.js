/**
 * Pure mapping from the new SGLang cookbook's declarative config objects
 * (docs_new/src/snippets/configs/<org>/<model>.jsx) to our engines/sglang block
 * schema. No IO — scripts/sync-sglang.mjs does the reading/writing/recipe-matching.
 *
 * A config carries a VARIANT axis (config.variants[]) — e.g. ["default"], or
 * ["flash","pro"], or the LFM2.5 family — and each variant maps, via
 * config.modelNames, to a distinct HF checkpoint, hence a distinct recipe. So one
 * config can yield several blocks. Scope: single-node TP only; multi-node is
 * derived at render time by the SGLang adapter from tp_by_hardware vs gpu_count.
 */

/**
 * Evaluate a config module's source text → its `config` object. These modules are
 * pure data (the object references no imports), but carry inline comments and
 * template strings, so evaluate via a constrained Function rather than regex.
 */
export function parseConfigModule(source) {
  const noImports = String(source).replace(/^\s*import\s.*$/gm, "");
  // Turn `export const config =` into `return`, and drop any other top-level export.
  const body = noImports
    .replace(/export\s+const\s+config\s*=/, "return ")
    .replace(/^\s*export\s+.*$/gm, "");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict";\n${body}`);
  return fn();
}

// A config's variant ids (the served-checkpoint axis). Falls back to ["default"]
// for a config that omits an explicit variants list.
export function configVariantIds(config) {
  const ids = (config?.variants || []).map((v) => v?.id).filter(Boolean);
  return ids.length ? ids : ["default"];
}

// Candidate served-checkpoint ids for one variant: the modelNames values whose
// key names this variant (keys look like "<variant>|<quant>" or
// "<hw>|<variant>|<quant>"), plus the cookbook's headline model as a fallback.
// The caller matches these against the recipe set (case-insensitively) to decide
// which recipe — if any — this variant belongs to.
export function candidateCheckpoints(config, variantId) {
  const out = [];
  for (const [key, val] of Object.entries(config?.modelNames || {})) {
    if (key.split("|").includes(variantId) && val) out.push(val);
  }
  const headline = config?.github?.cookbookModel;
  if (headline) out.push(headline);
  return [...new Set(out)];
}

// cell.flags entries are whole "--flag value" strings (e.g. "--tp 8").
function tpFromCell(cell) {
  for (const f of cell?.flags || []) {
    const m = /^--tp\s+(\d+)/.exec(f);
    if (m) return Number(m[1]);
  }
  return null;
}

// Pick a representative cell for a hardware among already variant-scoped cells:
// prefer a bf16 cell, else the first for that hardware.
function pickCell(cells, hw) {
  const forHw = cells.filter((c) => c?.match?.hw === hw);
  return forHw.find((c) => c.match?.quant === "bf16") || forHw[0] || null;
}

// Flags common to ALL of a variant's cells, excluding model-path/host/port/tp and
// the parser flags (parsers become toggleable features) → base_args.
function commonBaseArgs(cells) {
  if (!cells.length) return ["--trust-remote-code"];
  const EXCLUDE = /^--(model-path|host|port|tp|reasoning-parser|tool-call-parser)\b/;
  const sets = cells.map((c) => new Set((c.flags || []).filter((f) => !EXCLUDE.test(f))));
  const [first, ...rest] = sets;
  const common = [...first].filter((f) => rest.every((s) => s.has(f)));
  return common.length ? common : ["--trust-remote-code"];
}

// One (config, variant) → one block. `modelId` is the resolved served checkpoint
// (the caller matched it against the recipe set, so it equals the recipe hf_id).
// `recipePrecision` is authoritative for the checkpoint's precision.
export function configToBlock(config, variantId, modelId, recipePrecision, taxonomyHwIds) {
  const allCells = config?.cells || [];
  // If ANY cell is variant-tagged, trust the tags and use only this variant's
  // cells — never silently mix variants (an empty result yields empty tp, which
  // is safe; mixing would fabricate a wrong command). Only fall back to all
  // cells when NO cell carries a variant tag (a genuinely single-variant config).
  const anyTagged = allCells.some((c) => c?.match?.variant != null);
  const cells = anyTagged ? allCells.filter((c) => c?.match?.variant === variantId) : allCells;

  const tp_by_hardware = {};
  for (const hw of config?.supportedHardware || []) {
    if (taxonomyHwIds && !taxonomyHwIds.has(hw)) continue; // skip unknown hardware
    const tp = tpFromCell(pickCell(cells, hw));
    if (tp != null) tp_by_hardware[hw] = tp;
  }

  const features = {};
  for (const item of config?.playgroundFeatures?.parsers?.items || []) {
    const parts = String(item.flag || "").trim().split(/\s+/);
    if (parts[0] === "--tool-call-parser") features.tool_calling = { args: parts };
    else if (parts[0] === "--reasoning-parser") features.reasoning = { args: parts };
  }

  const block = {
    engine: "sglang",
    model_id: modelId,
    nightly_required: true,
    serve_binary: "python3 -m sglang.launch_server",
    base_args: commonBaseArgs(cells),
    tp_by_hardware,
    variants: { default: {} },
    strategies: { single_node_tp: {} },
    features,
  };

  const precision = recipePrecision || config?.quantizations?.[0]?.id || null;
  if (precision) block.variants.default.precision = precision;
  return block;
}
