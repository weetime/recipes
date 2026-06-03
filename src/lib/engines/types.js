/**
 * Engine adapter contract. Each inference engine (vLLM, SGLang, …) provides one
 * adapter; the registry in ./index.js dispatches to it. Adapters wrap a
 * synthesis implementation — they do NOT contain engine logic inline.
 *
 * @typedef {Object} EngineCapabilities
 * @property {string[]} variants     - selectable variant keys
 * @property {string[]} strategies   - compatible deployment strategy ids
 * @property {string[]} features     - toggleable feature keys
 * @property {boolean}  multiNode    - any multi-node strategy available
 * @property {boolean}  pd           - prefill/decode disaggregation available
 *
 * @typedef {Object} EngineAdapter
 * @property {string}   id
 * @property {Function} synthesize       - (recipe, variantKey, strategyName, hwId, features, strategies, taxonomy, advancedArgs, nodeCount, pdNodes) => command payload
 * @property {Function} synthesizeOmni   - (recipe, variantKey, task, hwProfile) => omni command payload
 * @property {(recipe:any)=>EngineCapabilities} capabilities
 */

/**
 * Identity helper that validates an adapter shape at module load. Keeps the
 * registry honest: a typo'd adapter fails fast at import instead of at render.
 * @param {EngineAdapter} adapter
 * @returns {EngineAdapter}
 */
export function defineEngine(adapter) {
  if (!adapter || typeof adapter.id !== "string") {
    throw new Error("engine adapter must have a string id");
  }
  if (typeof adapter.synthesize !== "function") {
    throw new Error(`engine '${adapter.id}' must implement synthesize()`);
  }
  if (typeof adapter.synthesizeOmni !== "function") {
    throw new Error(`engine '${adapter.id}' must implement synthesizeOmni()`);
  }
  return adapter;
}
