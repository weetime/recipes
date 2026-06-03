import { test } from "node:test";
import assert from "node:assert/strict";
import { engineList, engineSources } from "./engine-ui.js";

const RECIPE = {
  variants: { default: {}, fp8: {} },
  compatible_strategies: ["single_node_tp", "multi_node_tp"],
  features: { tool_calling: {}, reasoning: {} },
  opt_in_features: ["reasoning"],
  engines: {
    vllm: { min_version: "0.11.1" },
    sglang: {
      variants: { default: {} },
      strategies: { single_node_tp: {}, multi_node_tp: {} },
      features: { tool_calling: {} },
    },
  },
};

test("engineList returns the engine ids or ['vllm'] when none", () => {
  assert.deepEqual(engineList(RECIPE), ["vllm", "sglang"]);
  assert.deepEqual(engineList({}), ["vllm"]);
});

test("engineSources(vllm) reads top-level recipe fields", () => {
  const s = engineSources(RECIPE, "vllm");
  assert.deepEqual(s.variants, ["default", "fp8"]);
  assert.deepEqual(s.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(s.features, ["tool_calling", "reasoning"]);
  assert.deepEqual(s.defaultFeatures, ["tool_calling"]);
  assert.equal(s.defaultStrategy, "single_node_tp");
  assert.equal(s.defaultVariant, "default");
});

test("engineSources(sglang) reads the engines.sglang block", () => {
  const s = engineSources(RECIPE, "sglang");
  assert.deepEqual(s.variants, ["default"]);
  assert.deepEqual(s.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(s.features, ["tool_calling"]);
  assert.deepEqual(s.defaultFeatures, ["tool_calling"]);
  assert.equal(s.defaultStrategy, "single_node_tp");
  assert.equal(s.defaultVariant, "default");
});
