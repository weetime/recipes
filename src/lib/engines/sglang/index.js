import { defineEngine } from "../types.js";

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
// the TP flag, the strategy's templated extras, then enabled feature args, then
// any advanced args. `rank` fills {RANK} for the head (0) / worker (1) command.
function buildArgs(block, tp, strategyExtra, rank, featureArgs, advancedArgs) {
  const filledExtra = (strategyExtra || []).map((tok) =>
    tok === "{NNODES}" ? String(rank.nnodes) : tok === "{RANK}" ? String(rank.rank) : tok
  );
  return [
    ...(block.base_args || []),
    "--tp", String(tp),
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
// contract; vLLM-specific args (the strategies catalog, advancedArgs position,
// pdNodes) that SGLang doesn't use are accepted and ignored where N/A.
function synthesize(recipe, variantKey, strategyName, hwId, enabledFeatures, _strategies, taxonomy, advancedArgs = [], nodeCount = 1, _pdNodes = null) {
  const block = recipe?.engines?.sglang;
  if (!block) throw new Error("sglang adapter: recipe has no engines.sglang block");
  const modelId = block.model_id || recipe.model?.model_id || "unknown";
  const serveBinary = block.serve_binary || "python3 -m sglang.launch_server";
  const hwProfile = taxonomy?.hardware_profiles?.[hwId] || {};
  const gpuCount = typeof hwProfile.gpu_count === "number" ? hwProfile.gpu_count : 1;

  const strat = block.strategies?.[strategyName] || block.strategies?.single_node_tp || {};
  const featureArgs = [];
  for (const f of enabledFeatures || []) {
    const fa = block.features?.[f]?.args;
    if (fa) featureArgs.push(...fa);
  }

  const isMulti = strategyName.startsWith("multi_node_") && nodeCount > 1;
  if (isMulti) {
    const tp = gpuCount * nodeCount;
    const headArgs = buildArgs(block, tp, strat.extra, { nnodes: nodeCount, rank: 0 }, featureArgs, advancedArgs);
    const workerArgs = buildArgs(block, tp, strat.extra, { nnodes: nodeCount, rank: 1 }, featureArgs, advancedArgs);
    return {
      deployType: "multi_node",
      nodeCount,
      headCommand: formatCommand(serveBinary, modelId, headArgs),
      workerCommand: formatCommand(serveBinary, modelId, workerArgs),
      headArgv: formatArgv(serveBinary, modelId, headArgs),
      workerArgv: formatArgv(serveBinary, modelId, workerArgs),
      env: {},
    };
  }

  const tp = gpuCount;
  const args = buildArgs(block, tp, strat.extra, { nnodes: 1, rank: 0 }, featureArgs, advancedArgs);
  return {
    deployType: "single_node",
    command: formatCommand(serveBinary, modelId, args),
    argv: formatArgv(serveBinary, modelId, args),
    env: {},
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
