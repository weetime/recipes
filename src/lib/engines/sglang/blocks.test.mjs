import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const ROOT = process.cwd();
const BLOCKS = [
  "engines/sglang/deepseek-ai/DeepSeek-V3.yaml",
  "engines/sglang/Qwen/Qwen3-235B-A22B-Instruct-2507.yaml",
];

test("each sglang block parses and has the required shape", () => {
  for (const rel of BLOCKS) {
    const b = yaml.load(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    assert.equal(b.engine, "sglang", `${rel} engine`);
    assert.match(b.model_id, /\//, `${rel} model_id is org/repo`);
    assert.equal(typeof b.serve_binary, "string");
    assert.ok(Array.isArray(b.base_args), `${rel} base_args is array`);
    assert.ok(b.variants && b.variants.default, `${rel} has default variant`);
    assert.ok(b.strategies && b.strategies.single_node_tp, `${rel} has single_node_tp`);
    assert.ok(b.strategies.multi_node_tp, `${rel} has multi_node_tp`);
    assert.ok(Array.isArray(b.strategies.multi_node_tp.extra), `${rel} multi_node_tp.extra is array`);
  }
});

test("the block model_id matches its file path", () => {
  for (const rel of BLOCKS) {
    const b = yaml.load(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    const fromPath = rel.replace("engines/sglang/", "").replace(/\.yaml$/, "");
    assert.equal(b.model_id, fromPath, `${rel} model_id matches path`);
  }
});
