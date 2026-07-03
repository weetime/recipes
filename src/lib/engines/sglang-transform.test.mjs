import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigModule, configVariantIds, candidateCheckpoints, configToBlock } from "./sglang-transform.js";

test("parseConfigModule evaluates pure-data config, ignoring comments and imports", () => {
  const src = `
// top comment
import { Deployment } from "/src/snippets/_deployment.jsx";
export const config = {
  modelName: "X", // inline comment
  supportedHardware: ["h200", "gb200"],
  cells: [{ match: { hw: "h200" }, flags: ["--tp 8"] }],
  curl: \`curl http://{{HOST}}\`,
};
`;
  const cfg = parseConfigModule(src);
  assert.equal(cfg.modelName, "X");
  assert.deepEqual(cfg.supportedHardware, ["h200", "gb200"]);
  assert.equal(cfg.cells[0].flags[0], "--tp 8");
  assert.match(cfg.curl, /\{\{HOST\}\}/);
});

test("configVariantIds reads config.variants, falls back to ['default']", () => {
  assert.deepEqual(configVariantIds({ variants: [{ id: "flash" }, { id: "pro" }] }), ["flash", "pro"]);
  assert.deepEqual(configVariantIds({}), ["default"]);
});

test("candidateCheckpoints collects modelNames for a variant + headline fallback", () => {
  const cfg = {
    modelNames: {
      "flash|fp4": "deepseek-ai/DeepSeek-V4-Flash",
      "flash|nvfp4": "nvidia/DeepSeek-V4-Flash-NVFP4",
      "h200|flash|fp8": "sgl-project/DeepSeek-V4-Flash-FP8",
      "pro|fp4": "deepseek-ai/DeepSeek-V4-Pro",
    },
    github: { cookbookModel: "deepseek-ai/deepseek-v4" },
  };
  assert.deepEqual(candidateCheckpoints(cfg, "flash"), [
    "deepseek-ai/DeepSeek-V4-Flash",
    "nvidia/DeepSeek-V4-Flash-NVFP4",
    "sgl-project/DeepSeek-V4-Flash-FP8",
    "deepseek-ai/deepseek-v4",
  ]);
  assert.deepEqual(candidateCheckpoints(cfg, "pro"), ["deepseek-ai/DeepSeek-V4-Pro", "deepseek-ai/deepseek-v4"]);
});

const CFG = {
  modelName: "Laguna-M.1",
  variants: [{ id: "default" }],
  supportedHardware: ["h200", "gb200", "mi350x"], // mi350x not in taxonomy → skipped
  quantizations: [{ id: "bf16" }, { id: "fp8" }],
  modelNames: { "default|bf16": "poolside/Laguna-M.1", "default|fp8": "poolside/Laguna-M.1-FP8" },
  github: { cookbookModel: "poolside/Laguna-M.1" },
  playgroundFeatures: { parsers: { items: [
    { id: "reasoning", flag: "--reasoning-parser poolside_v1" },
    { id: "toolCall", flag: "--tool-call-parser poolside_v1" },
  ] } },
  cells: [
    { match: { hw: "h200", variant: "default", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 8", "--host {{HOST_IP}}"] },
    { match: { hw: "gb200", variant: "default", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 4", "--host {{HOST_IP}}"] },
  ],
};
const HW = new Set(["h200", "gb200", "b200"]);

test("configToBlock maps model_id/tp/base_args/features/nightly for the default variant", () => {
  const b = configToBlock(CFG, "default", "poolside/Laguna-M.1", "bf16", HW);
  assert.equal(b.engine, "sglang");
  assert.equal(b.model_id, "poolside/Laguna-M.1");
  assert.equal(b.nightly_required, true);
  assert.equal(b.serve_binary, "python3 -m sglang.launch_server");
  assert.deepEqual(b.base_args, ["--trust-remote-code"]);
  assert.deepEqual(b.tp_by_hardware, { h200: 8, gb200: 4 }); // mi350x skipped
  assert.equal(b.variants.default.precision, "bf16");
  assert.deepEqual(b.strategies.single_node_tp, {});
  assert.equal(b.strategies.multi_node_tp, undefined);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "poolside_v1"]);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "poolside_v1"]);
});

test("configToBlock filters cells by variant → each variant gets its own tp", () => {
  const cfg = {
    variants: [{ id: "flash" }, { id: "pro" }],
    supportedHardware: ["h200"],
    quantizations: [{ id: "fp8" }],
    playgroundFeatures: { parsers: { items: [{ flag: "--tool-call-parser deepseekv4" }] } },
    cells: [
      { match: { hw: "h200", variant: "flash", quant: "fp8" }, flags: ["--trust-remote-code", "--tp 4"] },
      { match: { hw: "h200", variant: "pro", quant: "fp8" }, flags: ["--trust-remote-code", "--tp 8"] },
    ],
  };
  const flash = configToBlock(cfg, "flash", "deepseek-ai/DeepSeek-V4-Flash", "fp8", HW);
  const pro = configToBlock(cfg, "pro", "deepseek-ai/DeepSeek-V4-Pro", "fp8", HW);
  assert.deepEqual(flash.tp_by_hardware, { h200: 4 });
  assert.deepEqual(pro.tp_by_hardware, { h200: 8 });
  assert.equal(flash.model_id, "deepseek-ai/DeepSeek-V4-Flash");
  assert.deepEqual(flash.features.tool_calling.args, ["--tool-call-parser", "deepseekv4"]);
});

test("configToBlock never mixes variants: a tagged config's absent variant → empty tp (not all-cells)", () => {
  const cfg = {
    variants: [{ id: "flash" }, { id: "pro" }],
    supportedHardware: ["h200"],
    quantizations: [{ id: "fp8" }],
    // Only 'flash' cells are present; 'pro' has none.
    cells: [{ match: { hw: "h200", variant: "flash", quant: "fp8" }, flags: ["--trust-remote-code", "--tp 4"] }],
  };
  const pro = configToBlock(cfg, "pro", "org/Pro", "fp8", HW);
  assert.deepEqual(pro.tp_by_hardware, {}); // must NOT absorb flash's --tp 4
});

test("configToBlock keeps parser=auto verbatim", () => {
  const cfg = { ...CFG, playgroundFeatures: { parsers: { items: [
    { flag: "--reasoning-parser auto" }, { flag: "--tool-call-parser auto" },
  ] } } };
  const b = configToBlock(cfg, "default", "x/y", "bf16", HW);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "auto"]);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "auto"]);
});
