import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEngine,
  listEngines,
  DEFAULT_ENGINE,
  resolveCommandForEngine,
} from "./index.js";
import { resolveCommand } from "../command-synthesis.js";

const RECIPE = {
  model: { model_id: "org/Model", base_args: ["--trust-remote-code"] },
  variants: { default: { precision: "bf16", vram_minimum_gb: 100 } },
  compatible_strategies: ["single_node_tp", "multi_node_tp", "pd_cluster"],
  features: { tool_calling: { args: ["--enable-auto-tool-choice"] } },
};
const STRATEGIES = {
  single_node_tp: {
    name: "single_node_tp",
    deploy_type: "single_node",
    parallel_flag: "--tensor-parallel-size",
  },
};
const TAXONOMY = {
  hardware_profiles: {
    h200: { gpu_count: 8, vram_gb: 1128, brand: "NVIDIA", generation: "hopper" },
  },
};

test("registry exposes vllm as the default engine", () => {
  assert.equal(DEFAULT_ENGINE, "vllm");
  assert.ok(listEngines().includes("vllm"));
  assert.equal(getEngine("vllm").id, "vllm");
  assert.equal(getEngine(), getEngine("vllm"));
});

test("unknown engine id throws", () => {
  assert.throws(() => getEngine("triton"), /unknown engine: triton/);
});

test("resolveCommandForEngine('vllm', …) is identical to resolveCommand(…)", () => {
  const args = [RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 1, null];
  const direct = resolveCommand(...args);
  const viaEngine = resolveCommandForEngine("vllm", ...args);
  assert.deepEqual(viaEngine, direct);
});

test("single-node TEP honors a hardware-specific TP layout", () => {
  const recipe = {
    model: { model_id: "org/MoE", base_args: [] },
    variants: { default: { precision: "bf16", vram_minimum_gb: 100 } },
    compatible_strategies: ["single_node_tep"],
    strategy_overrides: { single_node_tep: { tp: { ascend_910c: 8 } } },
  };
  const strategies = {
    single_node_tep: {
      name: "single_node_tep",
      deploy_type: "single_node",
      parallel_flag: "--tensor-parallel-size",
      vllm_args: ["--enable-expert-parallel"],
    },
  };
  const taxonomy = {
    hardware_profiles: {
      ascend_910c: { gpu_count: 16, vram_gb: 1024, brand: "Huawei", generation: "npu" },
    },
  };
  const result = resolveCommand(recipe, "default", "single_node_tep", "ascend_910c", [], strategies, taxonomy);
  assert.equal(result.argv[result.argv.indexOf("--tensor-parallel-size") + 1], "8");
  assert.ok(result.argv.includes("--enable-expert-parallel"));
});
