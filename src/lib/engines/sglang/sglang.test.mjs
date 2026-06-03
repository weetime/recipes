import { test } from "node:test";
import assert from "node:assert/strict";
import sglang, { sglangCapabilities } from "./index.js";
import { resolveCommandForEngine } from "../index.js";

// Minimal recipe carrying an sglang engine block, mirroring what the join attaches.
const BLOCK = {
  engine: "sglang",
  model_id: "deepseek-ai/DeepSeek-V3",
  serve_binary: "python3 -m sglang.launch_server",
  base_args: ["--trust-remote-code"],
  variants: { default: { precision: "bf16" } },
  strategies: {
    single_node_tp: {},
    multi_node_tp: { extra: ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"] },
  },
  features: { reasoning: { args: ["--reasoning-parser", "deepseek-r1"] } },
  tp_by_hardware: { h200: 4 },
};
const RECIPE = { model: { model_id: "deepseek-ai/DeepSeek-V3" }, engines: { sglang: BLOCK } };
const STRATEGIES = {}; // sglang ignores the vLLM strategy catalog
const TAXONOMY = { hardware_profiles: { h200: { gpu_count: 8, vram_gb: 1128, brand: "NVIDIA", generation: "hopper" } } };

test("adapter id and capabilities", () => {
  assert.equal(sglang.id, "sglang");
  const caps = sglangCapabilities(BLOCK);
  assert.deepEqual(caps.variants, ["default"]);
  assert.deepEqual(caps.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(caps.features, ["reasoning"]);
  assert.equal(caps.multiNode, true);
  assert.equal(caps.pd, false);
});

test("adapter.capabilities takes the full recipe (contract), extracting the block", () => {
  // The EngineAdapter contract is capabilities(recipe); the named helper takes a block.
  const fromRecipe = sglang.capabilities(RECIPE);
  assert.deepEqual(fromRecipe, sglangCapabilities(BLOCK));
  assert.deepEqual(fromRecipe.strategies, ["single_node_tp", "multi_node_tp"]);
});

test("single_node_tp renders --tp = gpu_count and --model-path", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 1, null);
  assert.equal(r.deployType, "single_node");
  assert.equal(
    r.command,
    "python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3 \\\n  --trust-remote-code \\\n  --tp 4"
  );
  assert.deepEqual(r.argv, ["python3", "-m", "sglang.launch_server", "--model-path", "deepseek-ai/DeepSeek-V3", "--trust-remote-code", "--tp", "4"]);
  assert.deepEqual(r.env, {});
});

test("enabled feature args append to the command", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", ["reasoning"], STRATEGIES, TAXONOMY, [], 1, null);
  assert.ok(r.command.endsWith("--reasoning-parser deepseek-r1"), r.command);
});

test("multi_node_tp renders head + worker with total TP and rank substitution", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "multi_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 2, null);
  assert.equal(r.deployType, "multi_node");
  assert.equal(r.nodeCount, 2);
  // total TP = tp_by_hardware.h200 * nodeCount = 4*2 = 8; head rank 0, worker rank 1
  assert.ok(r.headCommand.includes("--tp 8"), r.headCommand);
  assert.ok(r.headCommand.includes("--nnodes 2"), r.headCommand);
  assert.ok(r.headCommand.includes("--node-rank 0"), r.headCommand);
  assert.ok(r.headCommand.includes("--dist-init-addr $HEAD_IP:5000"), r.headCommand);
  assert.ok(r.workerCommand.includes("--node-rank 1"), r.workerCommand);
});

test("synthesizeOmni throws (sglang omni not supported in slice)", () => {
  assert.throws(() => sglang.synthesizeOmni(RECIPE, "default", {}, {}), /not supported/);
});

test("single_node_tp uses tp_by_hardware[hwId] when present and returns tp", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 1, null);
  assert.equal(r.tp, 4);                                 // from tp_by_hardware.h200, NOT gpu_count(8)
  assert.ok(r.command.includes("--tp 4"), r.command);
});

test("falls back to gpu_count when hwId is absent from tp_by_hardware", () => {
  const tax = { hardware_profiles: { ...TAXONOMY.hardware_profiles, h100: { gpu_count: 8, vram_gb: 640, brand: "NVIDIA", generation: "hopper" } } };
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h100", [], STRATEGIES, tax, [], 1, null);
  assert.equal(r.tp, 8);
  assert.ok(r.command.includes("--tp 8"), r.command);
});
