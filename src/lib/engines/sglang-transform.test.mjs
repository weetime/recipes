import { test } from "node:test";
import assert from "node:assert/strict";
import { compareVersions, modelToBlock, transform, HW_NAME_MAP } from "./sglang-transform.js";

test("compareVersions sorts numerically, not lexically", () => {
  assert.ok(compareVersions("v0.5.10", "v0.5.8") > 0);
  assert.ok(compareVersions("v0.5.6", "v0.5.10") < 0);
  assert.equal(compareVersions("v0.5.8", "v0.5.8"), 0);
});

const MODEL = {
  name: "Qwen3.6-35B-A3B",
  model_path: "Qwen/Qwen3.6-35B-A3B",
  attributes: { llm: { thinking_capability: "hybrid", tool_parser: "qwen3_coder", reasoning_parser: "qwen3", chat_template: null } },
  hardware: {
    H100: { configurations: [
      { name: "default", attributes: { nodes: "single", quantization: "bf16" }, quantized_model_path: null, engine: { tp: 1, extra_args: [] } },
    ] },
    H200: { configurations: [
      { name: "default", attributes: { nodes: "single", quantization: "bf16" }, engine: { tp: 1, extra_args: [] } },
    ] },
  },
};

test("modelToBlock maps parsers, per-hw tp, precision, single-node", () => {
  const b = modelToBlock(MODEL, "v0.5.10");
  assert.equal(b.engine, "sglang");
  assert.equal(b.model_id, "Qwen/Qwen3.6-35B-A3B");
  assert.equal(b.min_version, "v0.5.10");
  assert.equal(b.serve_binary, "python3 -m sglang.launch_server");
  assert.deepEqual(b.base_args, ["--trust-remote-code"]);
  assert.deepEqual(b.tp_by_hardware, { h100: 1, h200: 1 });
  assert.equal(b.variants.default.precision, "bf16");
  assert.deepEqual(b.strategies.single_node_tp, {});
  assert.equal(b.strategies.multi_node_tp, undefined);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "qwen3_coder"]);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "qwen3"]);
});

test("modelToBlock adds multi_node_tp when any config is nodes:multi", () => {
  const m = { ...MODEL, hardware: { B200: { configurations: [
    { name: "default", attributes: { nodes: "multi", quantization: "fp8" }, engine: { tp: 16, extra_args: [] } },
  ] } } };
  const b = modelToBlock(m, "v0.5.10");
  assert.ok(b.strategies.multi_node_tp, "multi_node_tp present");
  assert.deepEqual(b.strategies.multi_node_tp.extra, ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"]);
  assert.equal(b.variants.default.precision, "fp8");
  assert.deepEqual(b.tp_by_hardware, { b200: 16 });
});

test("modelToBlock drops a feature when its parser is null/absent", () => {
  const m = { ...MODEL, attributes: { llm: { thinking_capability: "non_thinking", tool_parser: null, reasoning_parser: null } } };
  const b = modelToBlock(m, "v0.5.8");
  assert.deepEqual(b.features, {});
});

test("transform: latest-wins across versions, overlap-only, logs skips", () => {
  const versionDocs = [
    { version: "v0.5.8", doc: { families: [{ models: [
      { ...MODEL, model_path: "Qwen/Qwen3.6-35B-A3B", hardware: { H200: { configurations: [{ name: "default", attributes: { quantization: "bf16" }, engine: { tp: 4 } }] } } },
    ] }] } },
    { version: "v0.5.10", doc: { families: [{ models: [
      MODEL,
      { ...MODEL, name: "SoloSGL", model_path: "acme/SoloSGL-1B" },
    ] }] } },
  ];
  const recipeHfIds = new Set(["Qwen/Qwen3.6-35B-A3B"]);
  const { blocks, skipped } = transform({ versionDocs, recipeHfIds });
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].hfId, "Qwen/Qwen3.6-35B-A3B");
  assert.equal(blocks[0].block.min_version, "v0.5.10");
  assert.deepEqual(blocks[0].block.tp_by_hardware, { h100: 1, h200: 1 });
  assert.deepEqual(skipped, ["acme/SoloSGL-1B"]);
});

test("HW_NAME_MAP covers the common NVIDIA + AMD ids", () => {
  for (const id of ["h100", "h200", "b200", "b300", "gb200", "gb300", "mi300x", "mi325x", "mi355x"]) {
    assert.ok(Object.values(HW_NAME_MAP).includes(id), `${id} is a mapping target`);
  }
});
