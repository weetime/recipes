import { resolveCommand, resolveOmniCommand } from "../../command-synthesis.js";
import { defineEngine } from "../types.js";

/**
 * Which selection axes a recipe exposes under the vLLM engine. Pure read of the
 * recipe — drives which CommandBuilder pill rows render (used from P4 onward).
 * @param {any} recipe
 */
export function vllmCapabilities(recipe) {
  const strategies = recipe?.compatible_strategies || [];
  return {
    variants: Object.keys(recipe?.variants || {}),
    strategies,
    features: Object.keys(recipe?.features || {}),
    multiNode: strategies.some((s) => s.startsWith("multi_node_")),
    pd: strategies.includes("pd_cluster"),
  };
}

export default defineEngine({
  id: "vllm",
  synthesize: resolveCommand,
  synthesizeOmni: resolveOmniCommand,
  capabilities: vllmCapabilities,
});
