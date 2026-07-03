import { defineEngine } from "../types.js";

// Canonical SGLang multi-node dist flags; {NNODES}/{RANK} are filled per command
// by buildArgs. Owned here (not the transformer) so the derived multi-node path
// works without any block change; a block may override via
// strategies.multi_node_tp.extra.
const MULTI_NODE_EXTRA = ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"];

// Derive node count from the block's per-hardware TP against the hardware's
// gpu_count (taxonomy). tp_by_hardware is upstream ground truth and is returned
// unchanged; nodes = max(1, ceil(tp / gpu_count)). A missing tp falls back to
// 1 — SGLang's own default when `--tp` is omitted (a single-node, single-GPU
// run) — rather than gpu_count, which would emit a wrong high `--tp` for a small
// model whose cookbook cell carries no `--tp` (e.g. baidu/Unlimited-OCR).
// Exported for direct unit testing.
export function deriveSglangNodes(block, hwId, taxonomy) {
  const hwProfile = taxonomy?.hardware_profiles?.[hwId] || {};
  const gpuCount = typeof hwProfile.gpu_count === "number" && hwProfile.gpu_count > 0 ? hwProfile.gpu_count : 1;
  const tp = block?.tp_by_hardware?.[hwId] ?? 1;
  const nodes = Math.max(1, Math.ceil(tp / gpuCount));
  return { tp, nodes, gpuCount };
}

// Pair each `--flag value` on one line with `\` continuations, mirroring the
// vLLM command formatter so the rendered SGLang command reads the same way.
function formatCommand(serveBinary, modelId, args) {
  const lines = [];
  for (let i = 0; i < args.length; i++) {
    const cur = args[i];
    const next = args[i + 1];
    if (cur.startsWith("-") && next !== undefined && !next.startsWith("-")) {
      lines.push(`${cur} ${next}`);
      i++;
    } else {
      lines.push(cur);
    }
  }
  const head = `${serveBinary} --model-path ${modelId}`;
  return lines.length ? `${head} \\\n  ${lines.join(" \\\n  ")}` : head;
}

function formatArgv(serveBinary, modelId, args) {
  return [...serveBinary.split(" "), "--model-path", modelId, ...args];
}

// Build the trailing args (everything after `--model-path <id>`): base args,
// the TP flag, any per-hardware extra args, the strategy's templated extras,
// then enabled feature args, then any advanced args. `rank` fills {RANK} for the
// head (0) / worker (1) command.
function buildArgs(block, tp, hwExtra, strategyExtra, rank, featureArgs, advancedArgs) {
  const filledExtra = (strategyExtra || []).map((tok) =>
    tok === "{NNODES}" ? String(rank.nnodes) : tok === "{RANK}" ? String(rank.rank) : tok
  );
  return [
    ...(block.base_args || []),
    "--tp", String(tp),
    ...(hwExtra || []),
    ...filledExtra,
    ...featureArgs,
    ...(advancedArgs || []),
  ];
}

export function sglangCapabilities(block) {
  const strategies = Object.keys(block?.strategies || {});
  return {
    variants: Object.keys(block?.variants || {}),
    strategies,
    features: Object.keys(block?.features || {}),
    multiNode: strategies.some((s) => s.startsWith("multi_node_")),
    pd: false,
  };
}

// Synthesize an SGLang launch command. Signature matches the EngineAdapter
// contract; vLLM-specific args (the strategies catalog, pdNodes) that SGLang
// doesn't use are accepted and ignored. The caller's nodeCount is ALSO ignored:
// node count is a consequence of (tp_by_hardware, gpu_count), derived here.
function synthesize(recipe, variantKey, strategyName, hwId, enabledFeatures, _strategies, taxonomy, advancedArgs = [], _nodeCount = 1, _pdNodes = null) {
  const block = recipe?.engines?.sglang;
  if (!block) throw new Error("sglang adapter: recipe has no engines.sglang block");
  const modelId = block.model_id || recipe.model?.model_id || "unknown";
  const serveBinary = block.serve_binary || "python3 -m sglang.launch_server";

  const featureArgs = [];
  for (const f of enabledFeatures || []) {
    const fa = block.features?.[f]?.args;
    if (fa) featureArgs.push(...fa);
  }

  const { tp, nodes } = deriveSglangNodes(block, hwId, taxonomy);

  // Per-hardware overrides: extra CLI args and env for one hardware profile only
  // (e.g. the INT8/NSA-CP/DeepEP/EAGLE config verified on PPU-ZW810E). Keyed by
  // hwId so other hardware is unaffected. env merges base_env then the override.
  const hwOverride = block.hardware_overrides?.[hwId] || {};
  const hwExtra = hwOverride.extra_args || [];
  const env = { ...(block.base_env || {}), ...(hwOverride.extra_env || {}) };

  if (nodes > 1) {
    // Derived multi-node (nodes from deriveSglangNodes, not strategyName). A block
    // may pin its own dist flags via strategies.multi_node_tp.extra (the explicit
    // upstream path); otherwise the adapter default applies, regardless of which
    // strategy name was passed. tp is the upstream value — never × nodes.
    const extra = block.strategies?.multi_node_tp?.extra ?? MULTI_NODE_EXTRA;
    const headArgs = buildArgs(block, tp, hwExtra, extra, { nnodes: nodes, rank: 0 }, featureArgs, advancedArgs);
    const workerArgs = buildArgs(block, tp, hwExtra, extra, { nnodes: nodes, rank: 1 }, featureArgs, advancedArgs);
    return {
      deployType: "multi_node",
      nodeCount: nodes,
      tp,
      headCommand: formatCommand(serveBinary, modelId, headArgs),
      workerCommand: formatCommand(serveBinary, modelId, workerArgs),
      headArgv: formatArgv(serveBinary, modelId, headArgs),
      workerArgv: formatArgv(serveBinary, modelId, workerArgs),
      env,
    };
  }

  const strat = block.strategies?.[strategyName] || block.strategies?.single_node_tp || {};
  const args = buildArgs(block, tp, hwExtra, strat.extra, { nnodes: 1, rank: 0 }, featureArgs, advancedArgs);
  return {
    deployType: "single_node",
    tp,
    command: formatCommand(serveBinary, modelId, args),
    argv: formatArgv(serveBinary, modelId, args),
    env,
  };
}

function synthesizeOmni() {
  throw new Error("sglang omni synthesis not supported in this slice");
}

// Contract: EngineAdapter.capabilities(recipe). Extract the block, then delegate
// to the block-level helper (also exported for direct/test use).
function capabilities(recipe) {
  return sglangCapabilities(recipe?.engines?.sglang || {});
}

export default defineEngine({
  id: "sglang",
  synthesize,
  synthesizeOmni,
  capabilities,
});
