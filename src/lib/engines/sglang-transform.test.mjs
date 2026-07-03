import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigModule, configToBlock, hfIdForConfig } from "./sglang-transform.js";

test("parseConfigModule 求值纯数据 config,忽略注释与 import", () => {
  const src = `
// 顶部注释
import { Deployment } from "/src/snippets/_deployment.jsx";
export const config = {
  modelName: "X", // 行内注释
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

const CFG = {
  modelName: "Laguna-M.1",
  supportedHardware: ["h200", "gb200", "mi350x"], // mi350x 不在 taxonomy → 跳过
  quantizations: [{ id: "bf16" }, { id: "fp8" }],
  modelNames: { "default|bf16": "poolside/Laguna-M.1", "default|fp8": "poolside/Laguna-M.1-FP8" },
  github: { cookbookModel: "poolside/Laguna-M.1" },
  playgroundFeatures: { parsers: { items: [
    { id: "reasoning", flag: "--reasoning-parser poolside_v1" },
    { id: "toolCall", flag: "--tool-call-parser poolside_v1" },
  ] } },
  cells: [
    { match: { hw: "h200", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 8", "--host {{HOST_IP}}"] },
    { match: { hw: "gb200", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 4", "--host {{HOST_IP}}"] },
  ],
};
const HW = new Set(["h200", "gb200", "b200"]);

test("configToBlock 映射 model_id/tp/base_args/features/nightly", () => {
  const b = configToBlock(CFG, "poolside/Laguna-M.1", "bf16", HW);
  assert.equal(b.engine, "sglang");
  assert.equal(b.model_id, "poolside/Laguna-M.1");
  assert.equal(b.nightly_required, true);
  assert.equal(b.serve_binary, "python3 -m sglang.launch_server");
  assert.deepEqual(b.base_args, ["--trust-remote-code"]);
  assert.deepEqual(b.tp_by_hardware, { h200: 8, gb200: 4 }); // mi350x 跳过
  assert.equal(b.variants.default.precision, "bf16");
  assert.deepEqual(b.strategies.single_node_tp, {});
  assert.equal(b.strategies.multi_node_tp, undefined);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "poolside_v1"]);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "poolside_v1"]);
});

test("configToBlock: 无 bf16 modelName 时 model_id 用量化 cookbookModel", () => {
  const cfg = { ...CFG, modelNames: {}, github: { cookbookModel: "MiniMaxAI/MiniMax-M3-MXFP8" } };
  const b = configToBlock(cfg, "MiniMaxAI/MiniMax-M3", "fp8", HW);
  assert.equal(b.model_id, "MiniMaxAI/MiniMax-M3-MXFP8");
});

test("configToBlock: parser=auto 原样保留", () => {
  const cfg = { ...CFG, playgroundFeatures: { parsers: { items: [
    { flag: "--reasoning-parser auto" }, { flag: "--tool-call-parser auto" },
  ] } } };
  const b = configToBlock(cfg, "x/y", "bf16", HW);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "auto"]);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "auto"]);
});

test("hfIdForConfig 去掉量化后缀", () => {
  assert.equal(hfIdForConfig({ github: { cookbookModel: "MiniMaxAI/MiniMax-M3-MXFP8" } }), "MiniMaxAI/MiniMax-M3");
  assert.equal(hfIdForConfig({ github: { cookbookModel: "poolside/Laguna-M.1" } }), "poolside/Laguna-M.1");
});
