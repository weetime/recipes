import { test } from "node:test";
import assert from "node:assert/strict";
import { attachEngines } from "./sglang-join.js";

test("attachEngines adds engines map when an sglang block exists on disk", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V3", model: { model_id: "deepseek-ai/DeepSeek-V3", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines, "engines attached");
  assert.equal(out.default_engine, "vllm");
  assert.deepEqual(out.engines.vllm, { min_version: "0.11.1" });
  assert.equal(out.engines.sglang.engine, "sglang");
  assert.equal(out.engines.sglang.model_id, "deepseek-ai/DeepSeek-V3");
});

test("attachEngines is a no-op for a model with no sglang block", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-R1", model: { model_id: "deepseek-ai/DeepSeek-R1", min_vllm_version: "0.9.0" } };
  const out = attachEngines(recipe);
  assert.equal(out.engines, undefined);
  assert.equal(out.default_engine, undefined);
});
