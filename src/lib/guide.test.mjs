import { test } from "node:test";
import assert from "node:assert/strict";
import { pickGuide } from "./guide.js";

const RECIPE = {
  guide: "# vLLM guide",
  engines: {
    vllm: { min_version: "0.19.0" },
    sglang: { engine: "sglang", guide: "# SGLang guide" },
  },
};

test("pickGuide: vllm engine returns the recipe's top-level guide", () => {
  assert.equal(pickGuide("vllm", RECIPE), "# vLLM guide");
});

test("pickGuide: missing/empty engine defaults to the vLLM guide", () => {
  assert.equal(pickGuide("", RECIPE), "# vLLM guide");
  assert.equal(pickGuide(undefined, RECIPE), "# vLLM guide");
});

test("pickGuide: sglang engine returns engines.sglang.guide", () => {
  assert.equal(pickGuide("sglang", RECIPE), "# SGLang guide");
});

test("pickGuide: sglang engine with no guide returns null (caller shows fallback)", () => {
  const r = { guide: "# vLLM", engines: { sglang: { engine: "sglang" } } };
  assert.equal(pickGuide("sglang", r), null);
});

test("pickGuide: no guide anywhere returns null", () => {
  assert.equal(pickGuide("vllm", { engines: {} }), null);
  assert.equal(pickGuide("sglang", {}), null);
});

test("pickGuide: an empty-string guide is treated as no guide (null)", () => {
  // Intentional: "" means there's nothing useful to render, so the caller shows
  // the fallback rather than an empty block. (`||`, not `??`.)
  assert.equal(pickGuide("vllm", { guide: "" }), null);
  assert.equal(pickGuide("sglang", { engines: { sglang: { guide: "" } } }), null);
});
