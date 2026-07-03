import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { attachEngines } from "./sglang-join.js";

// Build a throwaway {sglang, sglang-overlay, sglang-guides} dir trio for the
// isolated tests, so they don't depend on (or pollute) the repo's real engines/ tree.
function tmpDirs(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sglang-join-"));
  const sglangDir = path.join(root, "sglang");
  const sglangOverlayDir = path.join(root, "sglang-overlay");
  const sglangGuidesDir = path.join(root, "sglang-guides");
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return { sglangDir, sglangOverlayDir, sglangGuidesDir };
}

test("attachEngines adds engines map when a generated sglang block exists on disk", () => {
  const recipe = { hf_id: "MiniMaxAI/MiniMax-M3", model: { model_id: "MiniMaxAI/MiniMax-M3", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines, "engines attached");
  assert.equal(out.default_engine, "vllm");
  assert.deepEqual(out.engines.vllm, { min_version: "0.11.1" });
  assert.equal(out.engines.sglang.engine, "sglang");
  assert.equal(out.engines.sglang.model_id, "MiniMaxAI/MiniMax-M3");
});

test("attachEngines is a no-op for a model with no sglang block", () => {
  // A diffusion model that will never get an LLM-style SGLang block — served by
  // SGLang's separate diffusion stack, not launch_server.
  const recipe = { hf_id: "stabilityai/stable-diffusion-3.5-medium", model: { model_id: "stabilityai/stable-diffusion-3.5-medium", min_vllm_version: "0.9.0" } };
  const out = attachEngines(recipe);
  assert.equal(out.engines, undefined);
  assert.equal(out.default_engine, undefined);
});

test("attachEngines reads an authored SGLang guide into engines.sglang.guide", () => {
  // DeepSeek-V4-Pro has both a generated block and an authored guide.
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V4-Pro", model: { model_id: "deepseek-ai/DeepSeek-V4-Pro", min_vllm_version: "0.19.1" } };
  const out = attachEngines(recipe);
  assert.equal(typeof out.engines.sglang.guide, "string");
  assert.ok(out.engines.sglang.guide.includes("DeepSeek-V4-Pro"), "guide is the DeepSeek-V4-Pro authored prose");
});

test("attachEngines leaves guide unset when a block has no authored guide", () => {
  // GLM-5.2 has a generated block but no authored SGLang guide yet.
  const recipe = { hf_id: "zai-org/GLM-5.2", model: { model_id: "zai-org/GLM-5.2", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines.sglang, "sglang block still attached");
  assert.equal(out.engines.sglang.guide, undefined);
});

test("attachEngines deep-merges a fork-local overlay onto the generated block (PPU)", () => {
  const dirs = tmpDirs({
    "sglang/deepseek-ai/DeepSeek-V4-Flash.yaml":
      "engine: sglang\nmodel_id: deepseek-ai/DeepSeek-V4-Flash\ntp_by_hardware:\n  h200: 4\n  b200: 4\nfeatures: {}\n",
    "sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml":
      "tp_by_hardware:\n  thead_ppu_810e: 8\nhardware_overrides:\n  thead_ppu_810e:\n    extra_args: ['--quantization', 'w8a8_int8']\n",
  });
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V4-Flash", model: { min_vllm_version: "0.5.0" } };
  const out = attachEngines(recipe, dirs);
  const b = out.engines.sglang;
  assert.deepEqual(b.tp_by_hardware, { h200: 4, b200: 4, thead_ppu_810e: 8 });
  assert.deepEqual(b.hardware_overrides.thead_ppu_810e.extra_args, ["--quantization", "w8a8_int8"]);
  assert.equal(b.model_id, "deepseek-ai/DeepSeek-V4-Flash", "generated fields survive the merge");
});

test("attachEngines overlay replaces (not concatenates) an array at a colliding key", () => {
  const dirs = tmpDirs({
    "sglang/acme/Arr.yaml": "engine: sglang\nmodel_id: acme/Arr\nbase_args: ['--a', '--b']\n",
    "sglang-overlay/acme/Arr.yaml": "base_args: ['--c']\n",
  });
  const out = attachEngines({ hf_id: "acme/Arr", model: {} }, dirs);
  assert.deepEqual(out.engines.sglang.base_args, ["--c"], "overlay array replaces the base array");
});

test("attachEngines uses an overlay on its own when no generated block exists", () => {
  const dirs = tmpDirs({
    "sglang-overlay/acme/Only-Overlay.yaml": "engine: sglang\nmodel_id: acme/Only-Overlay\ntp_by_hardware:\n  h200: 1\n",
  });
  const recipe = { hf_id: "acme/Only-Overlay", model: { min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe, dirs);
  assert.ok(out.engines, "engines attached from the overlay alone");
  assert.equal(out.engines.sglang.model_id, "acme/Only-Overlay");
});

test("attachEngines is a no-op when neither a generated block nor an overlay exists", () => {
  const dirs = tmpDirs({});
  const out = attachEngines({ hf_id: "acme/Nothing", model: {} }, dirs);
  assert.equal(out.engines, undefined);
  assert.equal(out.default_engine, undefined);
});
