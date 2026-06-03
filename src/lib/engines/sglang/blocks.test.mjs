import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

// Validates the GENERATED engines/sglang/ tree (produced by scripts/sync-sglang.mjs)
// without hardcoding model names, so it stays correct as upstream evolves.

const ROOT = process.cwd();
const SGLANG_DIR = path.join(ROOT, "engines", "sglang");

function allBlockFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...allBlockFiles(full));
    else if (e.name.endsWith(".yaml")) out.push(full);
  }
  return out;
}

test("every generated SGLang block is well-formed", () => {
  const files = allBlockFiles(SGLANG_DIR);
  assert.ok(files.length > 0, "at least one generated block exists");
  for (const f of files) {
    const b = yaml.load(fs.readFileSync(f, "utf8"));
    const rel = path.relative(SGLANG_DIR, f).replace(/\.yaml$/, "");
    assert.equal(b.engine, "sglang", `${rel} engine`);
    assert.equal(b.model_id, rel, `${rel} model_id matches path`);
    assert.equal(typeof b.serve_binary, "string", `${rel} serve_binary`);
    assert.ok(Array.isArray(b.base_args), `${rel} base_args is array`);
    assert.ok(b.variants?.default, `${rel} has default variant`);
    assert.ok(b.strategies?.single_node_tp, `${rel} has single_node_tp`);
    assert.ok(b.tp_by_hardware && typeof b.tp_by_hardware === "object", `${rel} tp_by_hardware object`);
  }
});

test("every generated block's model_id has a matching vLLM recipe", () => {
  const files = allBlockFiles(SGLANG_DIR);
  for (const f of files) {
    const rel = path.relative(SGLANG_DIR, f).replace(/\.yaml$/, "");
    assert.ok(
      fs.existsSync(path.join(ROOT, "models", `${rel}.yaml`)),
      `${rel} should have models/${rel}.yaml (overlap-only invariant)`
    );
  }
});
