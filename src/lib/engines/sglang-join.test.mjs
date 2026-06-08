import { test } from "node:test";
import assert from "node:assert/strict";
import { attachEngines } from "./sglang-join.js";

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

test("attachEngines leaves guide unset when no authored SGLang guide exists", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V3.2", model: { model_id: "deepseek-ai/DeepSeek-V3.2", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines.sglang, "sglang block still attached");
  assert.equal(out.engines.sglang.guide, undefined);
});
