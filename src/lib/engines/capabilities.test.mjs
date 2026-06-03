import { test } from "node:test";
import assert from "node:assert/strict";
import { vllmCapabilities } from "./vllm/index.js";

test("capabilities reports every selection axis from the recipe", () => {
  const recipe = {
    variants: { default: {}, fp8: {} },
    compatible_strategies: ["single_node_tp", "multi_node_tp", "pd_cluster"],
    features: { tool_calling: {}, reasoning: {} },
  };
  const caps = vllmCapabilities(recipe);
  assert.deepEqual(caps.variants, ["default", "fp8"]);
  assert.deepEqual(caps.strategies, ["single_node_tp", "multi_node_tp", "pd_cluster"]);
  assert.deepEqual(caps.features, ["tool_calling", "reasoning"]);
  assert.equal(caps.multiNode, true);
  assert.equal(caps.pd, true);
});

test("capabilities degrades cleanly for a single-node-only dense recipe", () => {
  const recipe = {
    variants: { default: {} },
    compatible_strategies: ["single_node_tp"],
    features: {},
  };
  const caps = vllmCapabilities(recipe);
  assert.deepEqual(caps.variants, ["default"]);
  assert.deepEqual(caps.strategies, ["single_node_tp"]);
  assert.deepEqual(caps.features, []);
  assert.equal(caps.multiNode, false);
  assert.equal(caps.pd, false);
});

test("capabilities tolerates a missing/empty recipe", () => {
  const caps = vllmCapabilities(undefined);
  assert.deepEqual(caps.variants, []);
  assert.deepEqual(caps.strategies, []);
  assert.deepEqual(caps.features, []);
  assert.equal(caps.multiNode, false);
  assert.equal(caps.pd, false);
});
