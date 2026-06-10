import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { attachEngines } from "./sglang-join.js";

// Build a throwaway {sglang, sglang-manual, sglang-guides} dir trio for the
// manual-block tests, so they don't depend on (or pollute) the repo's real
// engines/ tree.
function tmpDirs(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sglang-join-"));
  const sglangDir = path.join(root, "sglang");
  const sglangManualDir = path.join(root, "sglang-manual");
  const sglangGuidesDir = path.join(root, "sglang-guides");
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return { sglangDir, sglangManualDir, sglangGuidesDir };
}

test("attachEngines adds engines map when an sglang block exists on disk", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V3.2", model: { model_id: "deepseek-ai/DeepSeek-V3.2", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines, "engines attached");
  assert.equal(out.default_engine, "vllm");
  assert.deepEqual(out.engines.vllm, { min_version: "0.11.1" });
  assert.equal(out.engines.sglang.engine, "sglang");
  assert.equal(out.engines.sglang.model_id, "deepseek-ai/DeepSeek-V3.2");
});

test("attachEngines is a no-op for a model with no sglang block", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-R1", model: { model_id: "deepseek-ai/DeepSeek-R1", min_vllm_version: "0.9.0" } };
  const out = attachEngines(recipe);
  assert.equal(out.engines, undefined);
  assert.equal(out.default_engine, undefined);
});

test("attachEngines reads an authored SGLang guide into engines.sglang.guide", () => {
  const recipe = { hf_id: "zai-org/GLM-5.1", model: { model_id: "zai-org/GLM-5.1", min_vllm_version: "0.19.1" } };
  const out = attachEngines(recipe);
  assert.equal(typeof out.engines.sglang.guide, "string");
  assert.ok(out.engines.sglang.guide.includes("sglang.launch_server"), "guide carries the launch command prose");
  assert.ok(out.engines.sglang.guide.includes("GLM-5.1"), "guide is the GLM-5.1 authored prose");
});

test("attachEngines falls back to a hand-authored manual block when no generated block exists", () => {
  const dirs = tmpDirs({
    "sglang-manual/acme/Custom-7B.yaml": "engine: sglang\nmodel_id: acme/Custom-7B\nmin_version: v0.5.6\nserve_binary: python3 -m sglang.launch_server\nvariants:\n  default:\n    precision: bf16\n",
  });
  const recipe = { hf_id: "acme/Custom-7B", model: { model_id: "acme/Custom-7B", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe, dirs);
  assert.ok(out.engines, "engines attached from the manual block");
  assert.equal(out.engines.sglang.engine, "sglang");
  assert.equal(out.engines.sglang.model_id, "acme/Custom-7B");
  assert.equal(out.engines.sglang.variants.default.precision, "bf16");
});

test("attachEngines prefers a generated block over a manual one (generated wins)", () => {
  const dirs = tmpDirs({
    "sglang/acme/Custom-7B.yaml": "engine: sglang\nmodel_id: acme/Custom-7B\nmin_version: GENERATED\n",
    "sglang-manual/acme/Custom-7B.yaml": "engine: sglang\nmodel_id: acme/Custom-7B\nmin_version: MANUAL\n",
  });
  const recipe = { hf_id: "acme/Custom-7B", model: { model_id: "acme/Custom-7B", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe, dirs);
  assert.equal(out.engines.sglang.min_version, "GENERATED", "generated block supersedes manual");
});

test("attachEngines merges a guide onto a manual block too", () => {
  const dirs = tmpDirs({
    "sglang-manual/acme/Custom-7B.yaml": "engine: sglang\nmodel_id: acme/Custom-7B\n",
    "sglang-guides/acme/Custom-7B.md": "## Overview\n\nServe with sglang.launch_server.\n",
  });
  const recipe = { hf_id: "acme/Custom-7B", model: { model_id: "acme/Custom-7B", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe, dirs);
  assert.equal(typeof out.engines.sglang.guide, "string");
  assert.ok(out.engines.sglang.guide.includes("sglang.launch_server"));
});

test("attachEngines leaves guide unset when no authored SGLang guide exists", () => {
  // Wan2.2 has an SGLang block but (deliberately) no authored guide — the LLM-chat
  // guide template doesn't fit a text-to-video diffusion model, so it stays on the
  // fallback notice. (Most other blocks now ship a guide.)
  const recipe = { hf_id: "Wan-AI/Wan2.2-T2V-A14B-Diffusers", model: { model_id: "Wan-AI/Wan2.2-T2V-A14B-Diffusers", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines.sglang, "sglang block still attached");
  assert.equal(out.engines.sglang.guide, undefined);
});
