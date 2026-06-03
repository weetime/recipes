/**
 * Engine-aware selection sources for CommandBuilder. Given a recipe and an
 * engine id, returns the variant/strategy/feature options + that engine's
 * default selections. Keeps the engine-branching logic out of the 2000-line
 * component and unit-testable.
 */

export function engineList(recipe) {
  const ids = recipe?.engines ? Object.keys(recipe.engines) : [];
  return ids.length ? ids : ["vllm"];
}

// Default-on features = all features minus the engine block's opt_in list.
function defaultFeaturesFrom(features, optIn) {
  const skip = new Set(optIn || []);
  return Object.keys(features || {}).filter((f) => !skip.has(f));
}

/**
 * @param {any} recipe
 * @param {string} engineId  "vllm" | "sglang"
 * @returns {{variants:string[], strategies:string[], features:string[],
 *            defaultVariant:string, defaultStrategy:string, defaultFeatures:string[]}}
 */
export function engineSources(recipe, engineId) {
  if (engineId === "vllm") {
    const variants = Object.keys(recipe?.variants || {});
    const strategies = recipe?.compatible_strategies || [];
    const features = Object.keys(recipe?.features || {});
    return {
      variants,
      strategies,
      features,
      defaultVariant: variants.includes("default") ? "default" : variants[0] || "default",
      defaultStrategy: strategies[0] || "single_node_tp",
      defaultFeatures: defaultFeaturesFrom(recipe?.features, recipe?.opt_in_features),
    };
  }
  const block = recipe?.engines?.[engineId] || {};
  const variants = Object.keys(block.variants || {});
  const strategies = Object.keys(block.strategies || {});
  const features = Object.keys(block.features || {});
  return {
    variants,
    strategies,
    features,
    defaultVariant: variants.includes("default") ? "default" : variants[0] || "default",
    defaultStrategy: strategies[0] || "single_node_tp",
    defaultFeatures: defaultFeaturesFrom(block.features, block.opt_in_features),
  };
}
