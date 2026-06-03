# Engine Adapter Layer (P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a pluggable engine-adapter seam (`src/lib/engines/`) and route the build pipeline through it, wrapping the existing vLLM command synthesis with **zero change to generated output**.

**Architecture:** A registry (`src/lib/engines/index.js`) maps engine ids to adapter objects. The vLLM adapter wraps the existing `command-synthesis.js` functions (no logic moves). `build-recipes-api.mjs` calls `resolveCommandForEngine("vllm", …)` instead of `resolveCommand(…)` directly. A golden snapshot of the entire generated `public/*.json` tree proves the refactor is byte-identical. This is phase P1 of the design in `docs/superpowers/specs/2026-06-03-unify-vllm-sglang-recipes-design.md`; it lands the abstraction with one engine before SGLang is introduced in P2.

**Tech Stack:** Node.js ESM (`.mjs`), Node built-in test runner (`node:test` + `node:assert`), js-yaml, Next.js (unchanged in this phase).

**Scope boundary:** This phase touches the build path only. `src/components/recipes/CommandBuilder.jsx` keeps importing `resolveCommand` directly and is rewired to the engine switcher in P4. The two call paths produce identical output, so this is a safe phase boundary.

---

### Task 1: Characterization snapshot harness

Captures a sha256 manifest of every JSON file the build emits, so any later refactor can be proven byte-identical. Built and baselined against the **current, unrefactored** code first.

**Files:**
- Create: `scripts/snapshot-api.mjs`
- Create: `scripts/__tests__/api-golden.json` (generated, committed)
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Write the snapshot script**

Create `scripts/snapshot-api.mjs`:

```js
/**
 * Characterization snapshot of the generated JSON API.
 *
 * Walks public/ for every .json the build emits (excluding fetched assets),
 * hashes each file, and either writes the golden manifest (--write) or checks
 * the current output against it (default). Used to prove that refactors of the
 * command-synthesis / engine layer leave generated output byte-identical.
 *
 * Usage:
 *   node scripts/build-recipes-api.mjs        # regenerate public/*.json first
 *   node scripts/snapshot-api.mjs --write     # capture baseline → api-golden.json
 *   node scripts/snapshot-api.mjs             # check against baseline (exit 1 on diff)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const PUBLIC = path.join(process.cwd(), "public");
const GOLDEN = path.join(process.cwd(), "scripts", "__tests__", "api-golden.json");

// public/ also holds build-time fetched assets (provider avatars, HF dates,
// platform logos) that this script does NOT generate — exclude them so the
// manifest reflects only command-synthesis output.
const EXCLUDE_DIRS = new Set(["providers", "platform-logos"]);
const EXCLUDE_FILES = new Set(["hf-dates.json"]);

function walk(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      out.push(...walk(path.join(dir, e.name), base));
    } else if (e.name.endsWith(".json")) {
      const rel = path.relative(base, path.join(dir, e.name));
      if (!EXCLUDE_FILES.has(rel)) out.push(rel);
    }
  }
  return out;
}

function manifest() {
  const m = {};
  for (const rel of walk(PUBLIC).sort()) {
    const buf = fs.readFileSync(path.join(PUBLIC, rel));
    m[rel] = crypto.createHash("sha256").update(buf).digest("hex");
  }
  return m;
}

const current = manifest();

if (process.argv[2] === "--write") {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, JSON.stringify(current, null, 2) + "\n");
  console.log(`✓ wrote golden manifest: ${Object.keys(current).length} files`);
  process.exit(0);
}

if (!fs.existsSync(GOLDEN)) {
  console.error("✗ no golden manifest — run `node scripts/snapshot-api.mjs --write` first");
  process.exit(1);
}
const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
const diffs = [];
for (const k of [...new Set([...Object.keys(golden), ...Object.keys(current)])].sort()) {
  if (golden[k] !== current[k]) {
    diffs.push(`${!golden[k] ? "added" : !current[k] ? "removed" : "changed"}: ${k}`);
  }
}
if (diffs.length) {
  console.error(`✗ API output diverged from golden (${diffs.length} file(s)):`);
  for (const d of diffs.slice(0, 40)) console.error("  " + d);
  if (diffs.length > 40) console.error(`  … and ${diffs.length - 40} more`);
  process.exit(1);
}
console.log(`✓ API output matches golden (${Object.keys(current).length} files)`);
```

- [ ] **Step 2: Add npm scripts**

In `package.json`, add to the `"scripts"` block (after `"validate"`):

```json
    "test": "node --test",
    "snapshot:api": "node scripts/snapshot-api.mjs",
    "snapshot:api:write": "node scripts/snapshot-api.mjs --write"
```

(Add a trailing comma to the line above as needed so the JSON stays valid.)

- [ ] **Step 3: Regenerate the API and capture the baseline**

Run:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs --write
```

Expected: build prints `✓ JSON API: N models …`, then `✓ wrote golden manifest: M files` (M is several hundred).

- [ ] **Step 4: Verify the checker passes against the just-written baseline**

Run:

```bash
node scripts/snapshot-api.mjs
```

Expected: `✓ API output matches golden (M files)` and exit code 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/snapshot-api.mjs scripts/__tests__/api-golden.json package.json
git commit -s -m "Add characterization snapshot harness for generated JSON API"
```

---

### Task 2: Engine registry + vLLM adapter (synthesize forwarding)

Introduce the adapter contract and a registry. The vLLM adapter wraps existing `command-synthesis.js` functions — no logic moves, so forwarding is provably identical.

**Files:**
- Create: `src/lib/engines/types.js`
- Create: `src/lib/engines/vllm/index.js`
- Create: `src/lib/engines/index.js`
- Test: `src/lib/engines/engines.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/engines.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEngine,
  listEngines,
  DEFAULT_ENGINE,
  resolveCommandForEngine,
} from "./index.js";
import { resolveCommand } from "../command-synthesis.js";

const RECIPE = {
  model: { model_id: "org/Model", base_args: ["--trust-remote-code"] },
  variants: { default: { precision: "bf16", vram_minimum_gb: 100 } },
  compatible_strategies: ["single_node_tp", "multi_node_tp", "pd_cluster"],
  features: { tool_calling: { args: ["--enable-auto-tool-choice"] } },
};
const STRATEGIES = {
  single_node_tp: {
    name: "single_node_tp",
    deploy_type: "single_node",
    parallel_flag: "--tensor-parallel-size",
  },
};
const TAXONOMY = {
  hardware_profiles: {
    h200: { gpu_count: 8, vram_gb: 1128, brand: "NVIDIA", generation: "hopper" },
  },
};

test("registry exposes vllm as the default engine", () => {
  assert.equal(DEFAULT_ENGINE, "vllm");
  assert.ok(listEngines().includes("vllm"));
  assert.equal(getEngine("vllm").id, "vllm");
  assert.equal(getEngine(), getEngine("vllm"));
});

test("unknown engine id throws", () => {
  assert.throws(() => getEngine("sglang"), /unknown engine: sglang/);
});

test("resolveCommandForEngine('vllm', …) is identical to resolveCommand(…)", () => {
  const args = [RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 1, null];
  const direct = resolveCommand(...args);
  const viaEngine = resolveCommandForEngine("vllm", ...args);
  assert.deepEqual(viaEngine, direct);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/engines/engines.test.mjs`
Expected: FAIL — `Cannot find module './index.js'` (the engine modules don't exist yet).

- [ ] **Step 3: Write the adapter contract**

Create `src/lib/engines/types.js`:

```js
/**
 * Engine adapter contract. Each inference engine (vLLM, SGLang, …) provides one
 * adapter; the registry in ./index.js dispatches to it. Adapters wrap a
 * synthesis implementation — they do NOT contain engine logic inline.
 *
 * @typedef {Object} EngineCapabilities
 * @property {string[]} variants     - selectable variant keys
 * @property {string[]} strategies   - compatible deployment strategy ids
 * @property {string[]} features     - toggleable feature keys
 * @property {boolean}  multiNode    - any multi-node strategy available
 * @property {boolean}  pd           - prefill/decode disaggregation available
 *
 * @typedef {Object} EngineAdapter
 * @property {string}   id
 * @property {Function} synthesize       - (recipe, variantKey, strategyName, hwId, features, strategies, taxonomy, advancedArgs, nodeCount, pdNodes) => command payload
 * @property {Function} synthesizeOmni   - (recipe, variantKey, task, hwProfile) => omni command payload
 * @property {(recipe:any)=>EngineCapabilities} capabilities
 */

/**
 * Identity helper that validates an adapter shape at module load. Keeps the
 * registry honest: a typo'd adapter fails fast at import instead of at render.
 * @param {EngineAdapter} adapter
 * @returns {EngineAdapter}
 */
export function defineEngine(adapter) {
  if (!adapter || typeof adapter.id !== "string") {
    throw new Error("engine adapter must have a string id");
  }
  if (typeof adapter.synthesize !== "function") {
    throw new Error(`engine '${adapter.id}' must implement synthesize()`);
  }
  return adapter;
}
```

- [ ] **Step 4: Write the vLLM adapter**

Create `src/lib/engines/vllm/index.js`:

```js
import { resolveCommand, resolveOmniCommand } from "../../command-synthesis.js";
import { defineEngine } from "../types.js";

/**
 * Which selection axes a recipe exposes under the vLLM engine. Pure read of the
 * recipe — drives which CommandBuilder pill rows render (used from P4 onward).
 * @param {any} recipe
 */
export function vllmCapabilities(recipe) {
  const strategies = recipe?.compatible_strategies || [];
  return {
    variants: Object.keys(recipe?.variants || {}),
    strategies,
    features: Object.keys(recipe?.features || {}),
    multiNode: strategies.some((s) => s.startsWith("multi_node_")),
    pd: strategies.includes("pd_cluster"),
  };
}

export default defineEngine({
  id: "vllm",
  synthesize: resolveCommand,
  synthesizeOmni: resolveOmniCommand,
  capabilities: vllmCapabilities,
});
```

- [ ] **Step 5: Write the registry**

Create `src/lib/engines/index.js`:

```js
import vllm from "./vllm/index.js";

// engine id → adapter. Add an engine by importing its adapter and adding it
// here; nothing else in the build/render path needs to change.
const REGISTRY = { [vllm.id]: vllm };

// vLLM is the site's primary engine and the first-load default everywhere.
export const DEFAULT_ENGINE = "vllm";

export function listEngines() {
  return Object.keys(REGISTRY);
}

export function getEngine(id = DEFAULT_ENGINE) {
  const adapter = REGISTRY[id];
  if (!adapter) {
    throw new Error(`unknown engine: ${id} (have: ${listEngines().join(", ")})`);
  }
  return adapter;
}

export function resolveCommandForEngine(engineId, ...args) {
  return getEngine(engineId).synthesize(...args);
}

export function resolveOmniCommandForEngine(engineId, ...args) {
  return getEngine(engineId).synthesizeOmni(...args);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node --test src/lib/engines/engines.test.mjs`
Expected: PASS — 3 tests, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/types.js src/lib/engines/vllm/index.js src/lib/engines/index.js src/lib/engines/engines.test.mjs
git commit -s -m "Add engine adapter registry and vLLM adapter (synthesize forwarding)"
```

---

### Task 3: vLLM adapter capabilities()

Add a unit test pinning `vllmCapabilities` behavior (the function was written in Task 2; this task locks it under test as the contract the UI will depend on in P4).

**Files:**
- Test: `src/lib/engines/capabilities.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/capabilities.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { vllmCapabilities } from "./vllm/index.js";

test("capabilities reports every selection axis from the recipe", () => {
  const recipe = {
    variants: { default: {}, fp8: {} },
    compatible_strategies: ["single_node_tp", "multi_node_tp", "pd_cluster"],
    features: { tool_calling: {}, reasoning: {} },
  };
  const caps = vllmCapabilities(recipe);
  assert.deepEqual(caps.variants, ["default", "fp8"]);
  assert.deepEqual(caps.strategies, ["single_node_tp", "multi_node_tp", "pd_cluster"]);
  assert.deepEqual(caps.features, ["tool_calling", "reasoning"]);
  assert.equal(caps.multiNode, true);
  assert.equal(caps.pd, true);
});

test("capabilities degrades cleanly for a single-node-only dense recipe", () => {
  const recipe = {
    variants: { default: {} },
    compatible_strategies: ["single_node_tp"],
    features: {},
  };
  const caps = vllmCapabilities(recipe);
  assert.deepEqual(caps.variants, ["default"]);
  assert.deepEqual(caps.strategies, ["single_node_tp"]);
  assert.deepEqual(caps.features, []);
  assert.equal(caps.multiNode, false);
  assert.equal(caps.pd, false);
});

test("capabilities tolerates a missing/empty recipe", () => {
  const caps = vllmCapabilities(undefined);
  assert.deepEqual(caps.variants, []);
  assert.deepEqual(caps.strategies, []);
  assert.deepEqual(caps.features, []);
  assert.equal(caps.multiNode, false);
  assert.equal(caps.pd, false);
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `node --test src/lib/engines/capabilities.test.mjs`
Expected: PASS — 3 tests, 0 failures. (Implementation already exists from Task 2; if any assertion fails, fix `vllmCapabilities` in `src/lib/engines/vllm/index.js` to match.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/engines/capabilities.test.mjs
git commit -s -m "Pin vLLM adapter capabilities() under test"
```

---

### Task 4: Route the build pipeline through the engine dispatcher

Switch `build-recipes-api.mjs` from calling `resolveCommand` directly to `resolveCommandForEngine("vllm", …)`. The golden snapshot must remain identical — this is the P1 guarantee.

**Files:**
- Modify: `scripts/build-recipes-api.mjs` (import block ~lines 22-34; `renderCommand` call ~lines 172-175)

- [ ] **Step 1: Remove `resolveCommand` from the command-synthesis import**

In `scripts/build-recipes-api.mjs`, the import block currently reads:

```js
import {
  pickDefaultHardware,
  listCompatibleHardware,
  recommendStrategy,
  fitsSingleNode,
  isHardwareScalable,
  pickFittingVariant,
  pdFitsSingleNode,
  resolveCommand,
  computeDockerMeta,
  buildDockerRun,
  buildDockerArgv,
} from "../src/lib/command-synthesis.js";
```

Change it to remove the `resolveCommand` line and add an import from the engine registry directly below:

```js
import {
  pickDefaultHardware,
  listCompatibleHardware,
  recommendStrategy,
  fitsSingleNode,
  isHardwareScalable,
  pickFittingVariant,
  pdFitsSingleNode,
  computeDockerMeta,
  buildDockerRun,
  buildDockerArgv,
} from "../src/lib/command-synthesis.js";
import { resolveCommandForEngine } from "../src/lib/engines/index.js";
```

- [ ] **Step 2: Route the synthesis call through the dispatcher**

In `renderCommand`, the call currently reads:

```js
    result = resolveCommand(
      recipe, variantKey, strategy, hwId, features, strategies, taxonomy, [], nodeCount, pdNodes
    );
```

Change it to:

```js
    result = resolveCommandForEngine(
      "vllm", recipe, variantKey, strategy, hwId, features, strategies, taxonomy, [], nodeCount, pdNodes
    );
```

- [ ] **Step 3: Regenerate the API and verify byte-identical output**

Run:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs
```

Expected: build prints `✓ JSON API: N models …`, then `✓ API output matches golden (M files)` and exit code 0. If it prints any `changed:` lines, the dispatcher is not forwarding identically — revert and investigate before continuing.

- [ ] **Step 4: Run the full test + lint suite**

Run:

```bash
node --test && pnpm lint
```

Expected: all tests pass; `pnpm lint` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-recipes-api.mjs
git commit -s -m "Route build pipeline through engine dispatcher (vLLM); output byte-identical"
```

---

### Task 5: Document the engine seam

Record the new layer in CLAUDE.md so future contributors (and P2's transformer work) know where the seam lives.

**Files:**
- Modify: `CLAUDE.md` (the `### Data pipeline` section)

- [ ] **Step 1: Add an engine-layer note**

In `CLAUDE.md`, find the bullet describing `src/lib/command-synthesis.js` (it begins `- \`src/lib/command-synthesis.js\` — **the core of the site**.`). Immediately after that bullet, add:

```markdown
- `src/lib/engines/` — **engine adapter seam.** `index.js` is a registry mapping engine ids (`vllm`, and later `sglang`) to adapter objects; `getEngine(id)` / `resolveCommandForEngine(id, …)` dispatch to one. The vLLM adapter (`engines/vllm/index.js`) wraps `command-synthesis.js` — engine logic stays in that file, the adapter only forwards and exposes `capabilities(recipe)`. Both the build script and (from P4) the CommandBuilder synthesize through this seam. Adding an engine = adding an adapter file + one registry line. See `docs/superpowers/specs/2026-06-03-unify-vllm-sglang-recipes-design.md`.
```

- [ ] **Step 2: Verify nothing else regressed**

Run:

```bash
node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && node --test
```

Expected: `✓ JSON API …`, `✓ API output matches golden …`, and all tests pass.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -s -m "Document the engine adapter seam in CLAUDE.md"
```

---

## Definition of done (P1)

- `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs` prints `✓ API output matches golden` — the refactor changed no generated output.
- `node --test` passes (registry, forwarding, capabilities).
- `pnpm lint` is clean.
- The build path synthesizes exclusively through `resolveCommandForEngine`; `command-synthesis.js` is unchanged in behavior and still owns all vLLM logic.
- Adding a second engine in P2 requires only a new adapter file + one line in `src/lib/engines/index.js`.

## Out of scope for P1 (later phases)

- P2: vendor SGLang upstream, write `scripts/sync-sglang.mjs` transformer → `engines/sglang/` tree.
- P3: build-time join into per-model JSON with an `engines` map + degradation rules.
- P4: CommandBuilder engine switcher; rewire CommandBuilder to `resolveCommandForEngine`; SGLang `synthesize`.
- P5: `pnpm sync:sglang` + CI drift PR.
