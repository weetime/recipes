import vllm from "./vllm/index.js";

// engine id → adapter. Add an engine by importing its adapter and adding it
// here; nothing else in the build/render path needs to change.
const REGISTRY = { [vllm.id]: vllm };

// vLLM is the site's primary engine and the first-load default everywhere.
export const DEFAULT_ENGINE = "vllm";

export function listEngines() {
  return Object.keys(REGISTRY);
}

export function getEngine(id = DEFAULT_ENGINE) {
  const adapter = REGISTRY[id];
  if (!adapter) {
    throw new Error(`unknown engine: ${id} (have: ${listEngines().join(", ")})`);
  }
  return adapter;
}

export function resolveCommandForEngine(engineId, ...args) {
  return getEngine(engineId).synthesize(...args);
}

export function resolveOmniCommandForEngine(engineId, ...args) {
  return getEngine(engineId).synthesizeOmni(...args);
}
