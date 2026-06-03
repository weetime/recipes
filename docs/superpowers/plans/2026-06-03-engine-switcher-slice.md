# Engine Switcher Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user switch between vLLM and SGLang on the same model page and see each engine's serve command, proven end-to-end on two hand-authored models (DeepSeek-V3, Qwen3-235B).

**Architecture:** Hand-author SGLang engine blocks under `engines/sglang/`, add an `sglang` adapter implementing the P1 `EngineAdapter` contract, join the SGLang block into the recipe object (in-memory for the UI + into the JSON API), and add an engine-pill row to CommandBuilder that redrives variant/strategy/features from a pure `engineSources(recipe, engineId)` helper and synthesizes via `resolveCommandForEngine`. Reuses the shared taxonomy hardware row and the identical command-result shape so command rendering/copy/docker are unchanged.

**Tech Stack:** Node ESM, Node built-in test runner (`node:test`), js-yaml, Next.js 15 / React 19 client component.

**Builds on:** P1 (merged) — `src/lib/engines/` registry + adapter contract + `scripts/snapshot-api.mjs` golden harness.

**Design:** `docs/superpowers/specs/2026-06-03-engine-switcher-slice-design.md`.

**Slice scope:** Only `single_node_tp` + `multi_node_tp` for SGLang. No DEP/EP/PD, no upstream transformer, no sync CI, no SGLang-only models — all deferred to follow-up PRs.

---

### Task 1: SGLang engine blocks (hand-authored data)

Two declarative YAML files describing how to serve each slice model under SGLang, plus a test that they parse and carry the required keys.

**Files:**
- Create: `engines/sglang/deepseek-ai/DeepSeek-V3.yaml`
- Create: `engines/sglang/Qwen/Qwen3-235B-A22B-Instruct-2507.yaml`
- Test: `src/lib/engines/sglang/blocks.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/sglang/blocks.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/engines/sglang/blocks.test.mjs`
Expected: FAIL — `ENOENT` (the YAML files don't exist yet).

- [ ] **Step 3: Author the DeepSeek-V3 block**

Create `engines/sglang/deepseek-ai/DeepSeek-V3.yaml`:

```yaml
# hand-authored slice — P2 transformer will generate this
engine: sglang
model_id: deepseek-ai/DeepSeek-V3
min_version: "0.4.6"
serve_binary: "python3 -m sglang.launch_server"
base_args:
  - "--trust-remote-code"
variants:
  default:
    precision: bf16
strategies:
  single_node_tp: {}
  multi_node_tp:
    extra:
      - "--nnodes"
      - "{NNODES}"
      - "--node-rank"
      - "{RANK}"
      - "--dist-init-addr"
      - "$HEAD_IP:5000"
features:
  reasoning:
    args: ["--reasoning-parser", "deepseek-r1"]
  tool_calling:
    args: ["--tool-call-parser", "deepseek"]
```

- [ ] **Step 4: Author the Qwen3-235B block**

Create `engines/sglang/Qwen/Qwen3-235B-A22B-Instruct-2507.yaml`:

```yaml
# hand-authored slice — P2 transformer will generate this
engine: sglang
model_id: Qwen/Qwen3-235B-A22B-Instruct-2507
min_version: "0.4.6"
serve_binary: "python3 -m sglang.launch_server"
base_args:
  - "--trust-remote-code"
variants:
  default:
    precision: bf16
strategies:
  single_node_tp: {}
  multi_node_tp:
    extra:
      - "--nnodes"
      - "{NNODES}"
      - "--node-rank"
      - "{RANK}"
      - "--dist-init-addr"
      - "$HEAD_IP:5000"
features:
  tool_calling:
    args: ["--tool-call-parser", "qwen25"]
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test src/lib/engines/sglang/blocks.test.mjs`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add engines/sglang/ src/lib/engines/sglang/blocks.test.mjs
git commit -s -m "Add hand-authored SGLang engine blocks for slice (DeepSeek-V3, Qwen3-235B)"
```

---

### Task 2: SGLang adapter

Implement the `sglang` adapter (synthesize + capabilities + omni stub) and register it. The slice supports `single_node_tp` and `multi_node_tp` only.

**Files:**
- Create: `src/lib/engines/sglang/index.js`
- Modify: `src/lib/engines/index.js` (register the adapter)
- Test: `src/lib/engines/sglang/sglang.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/sglang/sglang.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import sglang, { sglangCapabilities } from "./index.js";
import { resolveCommandForEngine } from "../index.js";

// Minimal recipe carrying an sglang engine block, mirroring what the join attaches.
const BLOCK = {
  engine: "sglang",
  model_id: "deepseek-ai/DeepSeek-V3",
  serve_binary: "python3 -m sglang.launch_server",
  base_args: ["--trust-remote-code"],
  variants: { default: { precision: "bf16" } },
  strategies: {
    single_node_tp: {},
    multi_node_tp: { extra: ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"] },
  },
  features: { reasoning: { args: ["--reasoning-parser", "deepseek-r1"] } },
};
const RECIPE = { model: { model_id: "deepseek-ai/DeepSeek-V3" }, engines: { sglang: BLOCK } };
const STRATEGIES = {}; // sglang ignores the vLLM strategy catalog
const TAXONOMY = { hardware_profiles: { h200: { gpu_count: 8, vram_gb: 1128, brand: "NVIDIA", generation: "hopper" } } };

test("adapter id and capabilities", () => {
  assert.equal(sglang.id, "sglang");
  const caps = sglangCapabilities(BLOCK);
  assert.deepEqual(caps.variants, ["default"]);
  assert.deepEqual(caps.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(caps.features, ["reasoning"]);
  assert.equal(caps.multiNode, true);
  assert.equal(caps.pd, false);
});

test("single_node_tp renders --tp = gpu_count and --model-path", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 1, null);
  assert.equal(r.deployType, "single_node");
  assert.equal(
    r.command,
    "python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3 \\\n  --trust-remote-code \\\n  --tp 8"
  );
  assert.deepEqual(r.argv, ["python3", "-m", "sglang.launch_server", "--model-path", "deepseek-ai/DeepSeek-V3", "--trust-remote-code", "--tp", "8"]);
  assert.deepEqual(r.env, {});
});

test("enabled feature args append to the command", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", ["reasoning"], STRATEGIES, TAXONOMY, [], 1, null);
  assert.ok(r.command.endsWith("--reasoning-parser deepseek-r1"), r.command);
});

test("multi_node_tp renders head + worker with total TP and rank substitution", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "multi_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 2, null);
  assert.equal(r.deployType, "multi_node");
  assert.equal(r.nodeCount, 2);
  // total TP = gpu_count * nodeCount = 16; head rank 0, worker rank 1
  assert.ok(r.headCommand.includes("--tp 16"), r.headCommand);
  assert.ok(r.headCommand.includes("--nnodes 2"), r.headCommand);
  assert.ok(r.headCommand.includes("--node-rank 0"), r.headCommand);
  assert.ok(r.headCommand.includes("--dist-init-addr $HEAD_IP:5000"), r.headCommand);
  assert.ok(r.workerCommand.includes("--node-rank 1"), r.workerCommand);
});

test("synthesizeOmni throws (sglang omni not supported in slice)", () => {
  assert.throws(() => sglang.synthesizeOmni(RECIPE, "default", {}, {}), /not supported/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: FAIL — cannot find `./index.js` under `src/lib/engines/sglang/`.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/engines/sglang/index.js`:

```js
import { defineEngine } from "../types.js";

// Pair each `--flag value` on one line with `\` continuations, mirroring the
// vLLM command formatter so the rendered SGLang command reads the same way.
function formatCommand(serveBinary, modelId, args) {
  const lines = [];
  for (let i = 0; i < args.length; i++) {
    const cur = args[i];
    const next = args[i + 1];
    if (cur.startsWith("-") && next !== undefined && !next.startsWith("-")) {
      lines.push(`${cur} ${next}`);
      i++;
    } else {
      lines.push(cur);
    }
  }
  const head = `${serveBinary} --model-path ${modelId}`;
  return lines.length ? `${head} \\\n  ${lines.join(" \\\n  ")}` : head;
}

function formatArgv(serveBinary, modelId, args) {
  return [...serveBinary.split(" "), "--model-path", modelId, ...args];
}

// Build the trailing args (everything after `--model-path <id>`): base args,
// the TP flag, the strategy's templated extras, then enabled feature args, then
// any advanced args. `rank` fills {RANK} for the head (0) / worker (1) command.
function buildArgs(block, tp, strategyExtra, rank, featureArgs, advancedArgs) {
  const filledExtra = (strategyExtra || []).map((tok) =>
    tok === "{NNODES}" ? String(rank.nnodes) : tok === "{RANK}" ? String(rank.rank) : tok
  );
  return [
    ...(block.base_args || []),
    "--tp", String(tp),
    ...filledExtra,
    ...featureArgs,
    ...(advancedArgs || []),
  ];
}

export function sglangCapabilities(block) {
  const strategies = Object.keys(block?.strategies || {});
  return {
    variants: Object.keys(block?.variants || {}),
    strategies,
    features: Object.keys(block?.features || {}),
    multiNode: strategies.some((s) => s.startsWith("multi_node_")),
    pd: false,
  };
}

// Synthesize an SGLang launch command. Signature matches the EngineAdapter
// contract; vLLM-specific args (the strategies catalog, advancedArgs position,
// pdNodes) that SGLang doesn't use are accepted and ignored where N/A.
function synthesize(recipe, variantKey, strategyName, hwId, enabledFeatures, _strategies, taxonomy, advancedArgs = [], nodeCount = 1, _pdNodes = null) {
  const block = recipe?.engines?.sglang;
  if (!block) throw new Error("sglang adapter: recipe has no engines.sglang block");
  const modelId = block.model_id || recipe.model?.model_id || "unknown";
  const serveBinary = block.serve_binary || "python3 -m sglang.launch_server";
  const hwProfile = taxonomy?.hardware_profiles?.[hwId] || {};
  const gpuCount = typeof hwProfile.gpu_count === "number" ? hwProfile.gpu_count : 1;

  const strat = block.strategies?.[strategyName] || block.strategies?.single_node_tp || {};
  const featureArgs = [];
  for (const f of enabledFeatures || []) {
    const fa = block.features?.[f]?.args;
    if (fa) featureArgs.push(...fa);
  }

  const isMulti = strategyName.startsWith("multi_node_") && nodeCount > 1;
  if (isMulti) {
    const tp = gpuCount * nodeCount;
    const headArgs = buildArgs(block, tp, strat.extra, { nnodes: nodeCount, rank: 0 }, featureArgs, advancedArgs);
    const workerArgs = buildArgs(block, tp, strat.extra, { nnodes: nodeCount, rank: 1 }, featureArgs, advancedArgs);
    return {
      deployType: "multi_node",
      nodeCount,
      headCommand: formatCommand(serveBinary, modelId, headArgs),
      workerCommand: formatCommand(serveBinary, modelId, workerArgs),
      headArgv: formatArgv(serveBinary, modelId, headArgs),
      workerArgv: formatArgv(serveBinary, modelId, workerArgs),
      env: {},
    };
  }

  const tp = gpuCount;
  const args = buildArgs(block, tp, strat.extra, { nnodes: 1, rank: 0 }, featureArgs, advancedArgs);
  return {
    deployType: "single_node",
    command: formatCommand(serveBinary, modelId, args),
    argv: formatArgv(serveBinary, modelId, args),
    env: {},
  };
}

function synthesizeOmni() {
  throw new Error("sglang omni synthesis not supported in this slice");
}

export default defineEngine({
  id: "sglang",
  synthesize,
  synthesizeOmni,
  capabilities: sglangCapabilities,
});
```

- [ ] **Step 4: Register the adapter in the registry**

In `src/lib/engines/index.js`, the top currently reads:

```js
import vllm from "./vllm/index.js";

// engine id → adapter. Add an engine by importing its adapter and adding it
// here; nothing else in the build/render path needs to change.
const REGISTRY = { [vllm.id]: vllm };
```

Change it to:

```js
import vllm from "./vllm/index.js";
import sglang from "./sglang/index.js";

// engine id → adapter. Add an engine by importing its adapter and adding it
// here; nothing else in the build/render path needs to change.
const REGISTRY = { [vllm.id]: vllm, [sglang.id]: sglang };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: PASS — 5 tests.
Then the full suite: `node --test`
Expected: all pass (P1's 11 + blocks 2 + sglang 5 = 18), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/lib/engines/sglang/index.js src/lib/engines/index.js src/lib/engines/sglang/sglang.test.mjs
git commit -s -m "Add SGLang engine adapter (single/multi-node TP) and register it"
```

---

### Task 3: Join the SGLang block into recipes + JSON API

Attach `recipe.engines` when an SGLang block exists, in both the in-memory reader (for the UI) and the build script (for the JSON API). Regenerate the golden and confirm only the two slice models changed.

**Files:**
- Create: `src/lib/engines/sglang-join.js`
- Modify: `src/lib/recipes.js`
- Modify: `scripts/build-recipes-api.mjs`
- Modify: `scripts/__tests__/api-golden.json` (regenerated)
- Test: `src/lib/engines/sglang-join.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/sglang-join.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: FAIL — cannot find `./sglang-join.js`.

- [ ] **Step 3: Implement the join helper**

Create `src/lib/engines/sglang-join.js`:

```js
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const SGLANG_DIR = path.join(process.cwd(), "engines", "sglang");

/**
 * If an SGLang engine block exists at engines/sglang/<hf_id>.yaml, attach an
 * `engines` map + `default_engine` to the recipe (mutates and returns it).
 *
 * IMPORTANT: engines.vllm is a lightweight descriptor ({ min_version }), NOT the
 * recipe object — CommandBuilder serializes `recipe` for client hydration, and a
 * self-reference would be a circular-JSON crash. vLLM synthesis still reads the
 * recipe's top-level fields; only SGLang reads engines.sglang.
 *
 * @param {any} recipe  parsed recipe carrying `hf_id`
 * @returns {any} the same recipe, possibly with `engines`/`default_engine`
 */
export function attachEngines(recipe) {
  const hfId = recipe?.hf_id;
  if (!hfId) return recipe;
  const blockPath = path.join(SGLANG_DIR, `${hfId}.yaml`);
  if (!fs.existsSync(blockPath)) return recipe;
  const block = yaml.load(fs.readFileSync(blockPath, "utf8"));
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
  recipe.default_engine = "vllm";
  return recipe;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: PASS — 2 tests.

- [ ] **Step 5: Wire the join into the in-memory reader**

In `src/lib/recipes.js`, add the import near the other imports at the top:

```js
import { attachEngines } from "./engines/sglang-join.js";
```

Then in `parseRecipe`, find the end of the function where it returns `raw` (the last statement is `return raw;`, right after the `raw.hf_released = …` block). Change that `return raw;` to:

```js
  return attachEngines(raw);
```

- [ ] **Step 6: Wire the join into the build script**

In `scripts/build-recipes-api.mjs`, add the import below the existing engine import (which is `import { resolveCommandForEngine } from "../src/lib/engines/index.js";`):

```js
import { attachEngines } from "../src/lib/engines/sglang-join.js";
```

Then find the recipe loop. After the line that sets `r.hf_id = ...` inside the `if (parts.length >= 2)` block (around where `hfOrg`/`hfRepo` are derived), the recipe `r` now has its `hf_id`. Locate the line `const install = synthesizeInstall(r);` and insert immediately BEFORE it:

```js
  // Attach the engines map (vLLM descriptor + SGLang block) when present so the
  // JSON API carries it. No-op for models without an SGLang block.
  attachEngines(r);
```

(`r.hf_id` is already set above that point, so `attachEngines` can find the block.)

- [ ] **Step 7: Regenerate the API, inspect the diff, update the golden**

First regenerate and see what changed against the existing golden:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs
```

Expected: the snapshot check now FAILS, listing `changed:`/`added:` entries. **Verify the changes are ONLY:**
- `changed: deepseek-ai/DeepSeek-V3.json` (and any of its per-hw/strategy files under `deepseek-ai/DeepSeek-V3/…`)
- `changed: Qwen/Qwen3-235B-A22B-Instruct-2507.json` (and its subtree)
- possibly `models.json` if the index shape changed (it should NOT — engines isn't in the index)

If ANY other model's JSON appears in the diff, STOP — the join leaked into unrelated recipes. Investigate before continuing.

Then confirm the engines map is actually in the slice JSON:

```bash
node -e "const j=require('./public/deepseek-ai/DeepSeek-V3.json'); console.log(JSON.stringify(j.engines, null, 2)); console.log('default_engine:', j.default_engine)"
```

Expected: prints an `engines` object with `vllm` (min_version) and `sglang` (the block), and `default_engine: vllm`.

Once the diff is confirmed limited to the two slice models, rewrite the golden:

```bash
node scripts/snapshot-api.mjs --write && node scripts/snapshot-api.mjs
```

Expected: `✓ wrote golden manifest: …` then `✓ API output matches golden (… files)`.

- [ ] **Step 8: Run the full test suite**

Run: `node --test`
Expected: all pass (P1's 11 + blocks 2 + sglang 5 + join 2 = 20), 0 failures.

- [ ] **Step 9: Commit**

```bash
git add src/lib/engines/sglang-join.js src/lib/engines/sglang-join.test.mjs src/lib/recipes.js scripts/build-recipes-api.mjs scripts/__tests__/api-golden.json
git commit -s -m "Join SGLang engine block into recipes and JSON API (slice: 2 models)"
```

---

### Task 4: CommandBuilder engine switcher

Add the engine-pill row and make variant/strategy/features engine-aware via a pure, unit-tested `engineSources` helper. The Hardware row and command rendering are unchanged.

**Files:**
- Create: `src/lib/engine-ui.js`
- Test: `src/lib/engine-ui.test.mjs`
- Modify: `src/components/recipes/CommandBuilder.jsx`

- [ ] **Step 1: Write the failing test for the pure helper**

Create `src/lib/engine-ui.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { engineList, engineSources } from "./engine-ui.js";

const RECIPE = {
  variants: { default: {}, fp8: {} },
  compatible_strategies: ["single_node_tp", "multi_node_tp"],
  features: { tool_calling: {}, reasoning: {} },
  opt_in_features: ["reasoning"],
  engines: {
    vllm: { min_version: "0.11.1" },
    sglang: {
      variants: { default: {} },
      strategies: { single_node_tp: {}, multi_node_tp: {} },
      features: { tool_calling: {} },
    },
  },
};

test("engineList returns the engine ids or ['vllm'] when none", () => {
  assert.deepEqual(engineList(RECIPE), ["vllm", "sglang"]);
  assert.deepEqual(engineList({}), ["vllm"]);
});

test("engineSources(vllm) reads top-level recipe fields", () => {
  const s = engineSources(RECIPE, "vllm");
  assert.deepEqual(s.variants, ["default", "fp8"]);
  assert.deepEqual(s.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(s.features, ["tool_calling", "reasoning"]);
  // default features = all minus opt_in
  assert.deepEqual(s.defaultFeatures, ["tool_calling"]);
  assert.equal(s.defaultStrategy, "single_node_tp");
  assert.equal(s.defaultVariant, "default");
});

test("engineSources(sglang) reads the engines.sglang block", () => {
  const s = engineSources(RECIPE, "sglang");
  assert.deepEqual(s.variants, ["default"]);
  assert.deepEqual(s.strategies, ["single_node_tp", "multi_node_tp"]);
  assert.deepEqual(s.features, ["tool_calling"]);
  assert.deepEqual(s.defaultFeatures, ["tool_calling"]); // sglang block has no opt_in
  assert.equal(s.defaultStrategy, "single_node_tp");
  assert.equal(s.defaultVariant, "default");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/engine-ui.test.mjs`
Expected: FAIL — cannot find `./engine-ui.js`.

- [ ] **Step 3: Implement the pure helper**

Create `src/lib/engine-ui.js`:

```js
/**
 * Engine-aware selection sources for CommandBuilder. Given a recipe and an
 * engine id, returns the variant/strategy/feature options + that engine's
 * default selections. Keeps the engine-branching logic out of the 2000-line
 * component and unit-testable.
 */

export function engineList(recipe) {
  const ids = recipe?.engines ? Object.keys(recipe.engines) : [];
  return ids.length ? ids : ["vllm"];
}

// Default-on features = all features minus the engine block's opt_in list.
function defaultFeaturesFrom(features, optIn) {
  const skip = new Set(optIn || []);
  return Object.keys(features || {}).filter((f) => !skip.has(f));
}

/**
 * @param {any} recipe
 * @param {string} engineId  "vllm" | "sglang"
 * @returns {{variants:string[], strategies:string[], features:string[],
 *            defaultVariant:string, defaultStrategy:string, defaultFeatures:string[]}}
 */
export function engineSources(recipe, engineId) {
  if (engineId === "vllm") {
    const variants = Object.keys(recipe?.variants || {});
    const strategies = recipe?.compatible_strategies || [];
    const features = Object.keys(recipe?.features || {});
    return {
      variants,
      strategies,
      features,
      defaultVariant: variants.includes("default") ? "default" : variants[0] || "default",
      defaultStrategy: strategies[0] || "single_node_tp",
      defaultFeatures: defaultFeaturesFrom(recipe?.features, recipe?.opt_in_features),
    };
  }
  // Non-vLLM engine: read its block from engines.<id>.
  const block = recipe?.engines?.[engineId] || {};
  const variants = Object.keys(block.variants || {});
  const strategies = Object.keys(block.strategies || {});
  const features = Object.keys(block.features || {});
  return {
    variants,
    strategies,
    features,
    defaultVariant: variants.includes("default") ? "default" : variants[0] || "default",
    defaultStrategy: strategies[0] || "single_node_tp",
    defaultFeatures: defaultFeaturesFrom(block.features, block.opt_in_features),
  };
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run: `node --test src/lib/engine-ui.test.mjs`
Expected: PASS — 4 tests.

- [ ] **Step 5: Add engine state + import to CommandBuilder**

In `src/components/recipes/CommandBuilder.jsx`:

(a) Update the engines import at the top — the file currently imports from `@/lib/command-synthesis` (line 7). Add a new import line directly below it:

```js
import { resolveCommandForEngine } from "@/lib/engines/index.js";
import { engineList, engineSources } from "@/lib/engine-ui";
```

(b) Inside `export function CommandBuilder({ recipe, strategies, taxonomy })` (line 320), near the other `useState` hooks (e.g. right after the `variant` state on line 330), add the engine state driven by the URL:

```js
  const engineIds = engineList(recipe);
  const [engine, setEngine] = useState(
    () => searchParams.get("engine") || recipe.default_engine || "vllm"
  );
```

- [ ] **Step 6: Make synthesis engine-aware**

In the synthesis `useMemo` (around line 689) the call is currently:

```js
      return resolveCommand(recipe, variant, activeStrategy, hwId, features, strategies, taxonomy, advArgs, nodeCount, pdNodes);
```

Change it to dispatch by engine, and add `engine` to the dependency array on the next line:

```js
      return resolveCommandForEngine(engine, recipe, variant, activeStrategy, hwId, features, strategies, taxonomy, advArgs, nodeCount, pdNodes);
```

Then in that memo's dependency array (the line beginning `[recipe, variant, activeStrategy, hwId, features, ...`), add `engine` as the first dependency:

```js
    [engine, recipe, variant, activeStrategy, hwId, features, advanced, advancedById, strategies, taxonomy, nodeCount, pdPrefillNodes, pdDecodeNodes, pdPrefillRank, pdDecodeRank]
```

- [ ] **Step 7: Render the Engine pill row**

Find the main (non-omni) Hardware row — the `<ConfigRow label="Hardware">` at approximately line 1370. Immediately BEFORE it, insert the Engine row (only rendered when there's more than one engine):

```jsx
          {engineIds.length > 1 && (
            <ConfigRow label="Engine">
              <PillGroup>
                {engineIds.map((id) => (
                  <Pill
                    key={id}
                    active={engine === id}
                    onClick={() => {
                      setEngine(id);
                      const src = engineSources(recipe, id);
                      // Reset selections that don't exist on the target engine.
                      if (!src.strategies.includes(strategyOverride)) setStrategyOverride("");
                      if (!src.variants.includes(variant)) setVariant(src.defaultVariant);
                      setFeatures(src.defaultFeatures);
                    }}
                  >
                    {id === "vllm" ? "vLLM" : id === "sglang" ? "SGLang" : id}
                  </Pill>
                ))}
              </PillGroup>
            </ConfigRow>
          )}
```

- [ ] **Step 8a: Add `sources` and make `activeStrategy` engine-aware**

After the `engine` state (Step 5b), add:

```js
  const sources = engineSources(recipe, engine);
```

The component derives `recommended` (line ~647) via `recommendStrategy(recipe, …)` which reads the **vLLM** `compatible_strategies` — meaningless for SGLang. And `activeStrategy = strategyOverride || recommended` (line ~661). Make the active strategy engine-aware so SGLang doesn't inherit a vLLM strategy id. Change line ~661 from:

```js
  const activeStrategy = strategyOverride || recommended;
```

to:

```js
  const activeStrategy = strategyOverride || (engine === "vllm" ? recommended : sources.defaultStrategy);
```

- [ ] **Step 8b: Make the Strategy row's source list engine-aware**

The `compatibleStrategies` memo (line ~650) filters `recipe.compatible_strategies` against the vLLM `strategies` catalog. Keep that for vLLM; use the SGLang block's strategy ids otherwise. Rename the existing memo and add an engine-aware selector. Change the memo declaration (line ~650, `const compatibleStrategies = useMemo(() => { … }, [recipe, strategies, nodeCount]);`) so the memo is assigned to `vllmCompatibleStrategies`, then immediately below it add:

```js
  const compatibleStrategies = engine === "vllm" ? vllmCompatibleStrategies : sources.strategies;
```

In the Strategy row JSX (line ~1465, `{compatibleStrategies.map((s) => {`), the pill uses `strategies[s]?.display_name || s` and `strategies[s]?.description` — for SGLang `strategies[s]` is `undefined`, so it falls back to the raw id (`single_node_tp`) and no description. That's acceptable for the slice. The `recommended` Sparkles (line ~1474) and the orientation badge (line ~1486) reference the vLLM catalog and simply won't render for SGLang — leave them as-is (they no-op when `strategies[activeStrategy]` is undefined).

- [ ] **Step 8c: Make the Variant row engine-aware (and guard the GB label)**

The Variant row (line ~1434) maps `Object.entries(recipe.variants || {})`. SGLang blocks have variants without `vram_minimum_gb`, so the disabled-check and the GB span need guarding. Change the map source and guard the SGLang case. Replace the opening of the map (line ~1434):

```jsx
              {Object.entries(recipe.variants || {}).map(([key, v]) => {
                // On non-scalable hardware (single-GPU workstation) a variant
                // that doesn't fit has nowhere to shard — disable it instead of
                // rendering a command that can't run.
                const disabled = !hwScalable && !variantRunsOnHardware(hwProfile, v);
```

with an engine-aware variant source + a disabled-guard that only applies vLLM's VRAM logic for vLLM:

```jsx
              {Object.entries(
                engine === "vllm" ? (recipe.variants || {}) : (recipe.engines?.[engine]?.variants || {})
              ).map(([key, v]) => {
                // vLLM disables variants that can't fit/shard on the hardware;
                // SGLang slice blocks carry no VRAM, so never disable there.
                const disabled = engine === "vllm" && !hwScalable && !variantRunsOnHardware(hwProfile, v);
```

Then guard the VRAM span so it only renders when a value exists. Change (line ~1455):

```jsx
                    <span className="text-muted-foreground ml-1.5 font-mono">{v.vram_minimum_gb} GB</span>
```

to:

```jsx
                    {v.vram_minimum_gb && (
                      <span className="text-muted-foreground ml-1.5 font-mono">{v.vram_minimum_gb} GB</span>
                    )}
```

- [ ] **Step 8d: Make the Features row engine-aware**

The Features row guard (line ~1576) and map (line ~1579) read `recipe.features`. Source them from the active engine. Define a local right before the row (or reuse `sources`): the feature config map is `recipe.features` for vLLM, `recipe.engines?.[engine]?.features` for others. Change the guard:

```jsx
          {Object.keys(recipe.features || {}).length > 0 && (
```

to:

```jsx
          {(() => { const featMap = engine === "vllm" ? (recipe.features || {}) : (recipe.engines?.[engine]?.features || {}); return Object.keys(featMap).length > 0; })() && (
```

and the map (line ~1579) `{Object.entries(recipe.features || {}).map(([key, f]) => (` to:

```jsx
                {Object.entries(engine === "vllm" ? (recipe.features || {}) : (recipe.engines?.[engine]?.features || {})).map(([key, f]) => (
```

(The per-key icon `if`s — `spec_decoding`/`tool_calling`/`reasoning` — stay; they no-op for unmatched keys.)

**Guardrail:** keep the vLLM path byte-identical — every change above is a no-op when `engine === "vllm"`. The Hardware row (line ~1370) and the Nodes row (line ~1503) stay shared and unchanged (SGLang multi-node TP uses the same Nodes pills). If any row needs more than the localized change shown here, STOP and report DONE_WITH_CONCERNS with what you found — do NOT restructure the component broadly.

- [ ] **Step 9: Sync the engine to the URL**

This component syncs other selections to URL query params (search for where `variant`/`hardware`/`strategy` are written to the URL — typically a `useEffect` building a `URLSearchParams`). Add `engine` to that sync the same way the others are handled: when `engine !== (recipe.default_engine || "vllm")`, set `params.set("engine", engine)`, else delete it. Mirror the exact pattern used for `strategy`/`hardware` in that effect.

- [ ] **Step 10: Verify the build, golden, and a manual render**

Run:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && node --test
```

Expected: `✓ JSON API …`, `✓ API output matches golden (… files)` (Task 3 already rebaselined the golden; this task changes no generated JSON), and all 24 tests pass (20 from before + 4 engine-ui).

Then a manual smoke check against the dev server (it is already running — do NOT restart it). Use the existing dev server URL:

```bash
curl -s http://localhost:3000/deepseek-ai/DeepSeek-V3 | grep -c "Engine" || true
curl -s "http://localhost:3000/deepseek-ai/DeepSeek-V3?engine=sglang" | grep -o "sglang.launch_server" | head -1
```

Expected: the page HTML contains an "Engine" label, and the `?engine=sglang` render contains `sglang.launch_server`. If the dev server isn't running, note it and rely on the build + tests instead — do not start or restart it.

- [ ] **Step 11: Commit**

```bash
git add src/lib/engine-ui.js src/lib/engine-ui.test.mjs src/components/recipes/CommandBuilder.jsx
git commit -s -m "Add engine switcher to CommandBuilder (vLLM/SGLang), engine-aware selection rows"
```

---

### Task 5: Document the slice + update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the engines/sglang tree and switcher**

In `CLAUDE.md`, the engine-seam bullet (added in P1, begins `- \`src/lib/engines/\` — **engine adapter seam.**`) describes the registry. Immediately after that bullet, add:

```markdown
- `engines/sglang/<org>/<repo>.yaml` — **SGLang engine blocks** (currently hand-authored for the DeepSeek-V3 + Qwen3-235B slice; P2 will generate them from vendored upstream). `src/lib/engines/sglang/index.js` renders `python3 -m sglang.launch_server …` from a block; `src/lib/engines/sglang-join.js` attaches `recipe.engines = { vllm:{min_version}, sglang:<block> }` + `default_engine` when a block exists (no-op otherwise). `engines.vllm` is a descriptor, NOT the recipe (CommandBuilder serializes `recipe` for client hydration — a self-reference would crash). The Engine pill row in `CommandBuilder.jsx` shows only when `recipe.engines` has 2+ entries; `src/lib/engine-ui.js` (`engineSources`) drives engine-aware variant/strategy/feature options.
```

- [ ] **Step 2: Verify nothing regressed**

Run:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && node --test
```

Expected: build healthy, snapshot matches golden, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -s -m "Document the SGLang engine blocks and switcher in CLAUDE.md"
```

---

## Definition of done (slice)

- `node --test` passes (24 tests: P1's 11 + blocks 2 + sglang 5 + join 2 + engine-ui 4).
- `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs` → matches golden; the only generated changes vs the pre-slice golden are the two slice models' JSON (gaining an `engines` map).
- On `/deepseek-ai/DeepSeek-V3`, an Engine pill row appears; switching to SGLang renders `python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3 --tp 8 …`; switching back renders `vllm serve …`. Models without an SGLang block show no Engine row (unchanged).
- vLLM behavior is unchanged for every other model.

## Out of scope (follow-up PRs)

- P2 full: vendor `upstream/sglang/`, write `scripts/sync-sglang.mjs` transformer to generate `engines/sglang/` for all models.
- SGLang DEP/EP/PD parallelism + per-hardware overrides.
- SGLang-only models entering the catalog (with synthesized minimal meta).
- P5: `pnpm sync:sglang` + CI drift PR.
