# SGLang Faithful Multi-Node TP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render SGLang deployments whose per-hardware `tp` exceeds a node's `gpu_count` as correct multi-node head/worker commands, deriving the node count at render time.

**Architecture:** A pure helper in the SGLang adapter computes `nodes = ceil(tp / gpu_count)` from the block's authoritative `tp_by_hardware` against the live taxonomy `gpu_count`. The adapter renders multi-node whenever `nodes > 1`, owning the dist-flag template; the node count is a consequence of (hardware, tp), never the caller's `nodeCount`. The transformer drops its inert `nodes:multi` branch. The CommandBuilder hides the Nodes row (and a single-strategy Strategy row) for non-vLLM engines and reads node count from the adapter result.

**Tech Stack:** Node.js ESM, `node --test`, Next.js/React (CommandBuilder), js-yaml, ESLint (`pnpm lint`).

**Spec:** `docs/superpowers/specs/2026-06-03-sglang-faithful-multinode-tp-design.md`

---

## File Structure

- **Modify** `src/lib/engines/sglang/index.js` — add exported `deriveSglangNodes`, add `MULTI_NODE_EXTRA` constant, rewrite `synthesize` to derive nodes (ignore `nodeCount`, drop the `strategyName`-based gate).
- **Modify** `src/lib/engines/sglang/sglang.test.mjs` — add `deriveSglangNodes` tests; replace the old `× nodeCount` multi-node test with derived-multi tests.
- **Modify** `src/lib/engines/sglang-transform.js` — remove `MULTI_NODE_EXTRA` and the `nodes:multi` attachment.
- **Modify** `src/lib/engines/sglang-transform.test.mjs` — replace the "adds multi_node_tp" test with a "never emits multi_node_tp" test.
- **Modify** `src/components/recipes/CommandBuilder.jsx` — hide Nodes row for non-vLLM; hide Strategy row for non-vLLM with ≤1 strategy; derive the config-summary node multiplier from `result.nodeCount`.
- **Regenerate (no-op expected)** `engines/sglang/**` via `node scripts/sync-sglang.mjs`; **guard** the golden with `build-recipes-api.mjs` + `snapshot-api.mjs`.

---

## Task 1: `deriveSglangNodes` helper + multi-node flag constant

**Files:**
- Modify: `src/lib/engines/sglang/index.js` (add constant near top after the import; add exported helper before `synthesize`)
- Test: `src/lib/engines/sglang/sglang.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add to the import line at the top of `src/lib/engines/sglang/sglang.test.mjs` so it reads:

```js
import sglang, { sglangCapabilities, deriveSglangNodes } from "./index.js";
```

Append these tests to the end of the file:

```js
const TAX_MULTI = {
  hardware_profiles: {
    h100: { gpu_count: 8, vram_gb: 640, brand: "NVIDIA", generation: "hopper" },
    h200: { gpu_count: 8, vram_gb: 1128, brand: "NVIDIA", generation: "hopper" },
  },
};

test("deriveSglangNodes: tp > gpu_count → ceil(tp/gpu) nodes, tp unchanged", () => {
  const block = { tp_by_hardware: { h100: 32 } };
  assert.deepEqual(deriveSglangNodes(block, "h100", TAX_MULTI), { tp: 32, nodes: 4, gpuCount: 8 });
});

test("deriveSglangNodes: tp == gpu_count → single node", () => {
  const block = { tp_by_hardware: { h100: 8 } };
  assert.deepEqual(deriveSglangNodes(block, "h100", TAX_MULTI), { tp: 8, nodes: 1, gpuCount: 8 });
});

test("deriveSglangNodes: tp < gpu_count → single node", () => {
  const block = { tp_by_hardware: { h100: 4 } };
  assert.deepEqual(deriveSglangNodes(block, "h100", TAX_MULTI), { tp: 4, nodes: 1, gpuCount: 8 });
});

test("deriveSglangNodes: missing tp falls back to gpu_count (single node)", () => {
  const block = { tp_by_hardware: {} };
  assert.deepEqual(deriveSglangNodes(block, "h200", TAX_MULTI), { tp: 8, nodes: 1, gpuCount: 8 });
});

test("deriveSglangNodes: non-divisible tp rounds nodes up, keeps upstream tp", () => {
  const block = { tp_by_hardware: { h100: 12 } };
  assert.deepEqual(deriveSglangNodes(block, "h100", TAX_MULTI), { tp: 12, nodes: 2, gpuCount: 8 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: FAIL — `deriveSglangNodes` is not exported (`TypeError` / undefined import).

- [ ] **Step 3: Add the constant and helper**

In `src/lib/engines/sglang/index.js`, the current top is:

```js
import { defineEngine } from "../types.js";
```

Replace it with:

```js
import { defineEngine } from "../types.js";

// Canonical SGLang multi-node dist flags; {NNODES}/{RANK} are filled per command
// by buildArgs. Owned here (not the transformer) so the derived multi-node path
// works without any block change; a block may override via
// strategies.multi_node_tp.extra.
const MULTI_NODE_EXTRA = ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"];

// Derive node count from the block's per-hardware TP against the hardware's
// gpu_count (taxonomy). tp_by_hardware is upstream ground truth and is returned
// unchanged; nodes = max(1, ceil(tp / gpu_count)). A missing tp falls back to
// gpu_count (→ single node). Exported for direct unit testing.
export function deriveSglangNodes(block, hwId, taxonomy) {
  const hwProfile = taxonomy?.hardware_profiles?.[hwId] || {};
  const gpuCount = typeof hwProfile.gpu_count === "number" && hwProfile.gpu_count > 0 ? hwProfile.gpu_count : 1;
  const tp = block?.tp_by_hardware?.[hwId] ?? gpuCount;
  const nodes = Math.max(1, Math.ceil(tp / gpuCount));
  return { tp, nodes, gpuCount };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: the five new `deriveSglangNodes` tests PASS. (The old `multi_node_tp renders ... total TP` test at lines 57–67 may now FAIL — that is expected and fixed in Task 2.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/sglang/index.js src/lib/engines/sglang/sglang.test.mjs
git commit -s -m "Add deriveSglangNodes helper + adapter-owned multi-node flag template"
```

---

## Task 2: Rewrite `synthesize` to derive nodes from tp vs gpu_count

**Files:**
- Modify: `src/lib/engines/sglang/index.js:55-96` (the `synthesize` function)
- Test: `src/lib/engines/sglang/sglang.test.mjs`

- [ ] **Step 1: Replace the old multi-node test with derived-multi tests**

In `src/lib/engines/sglang/sglang.test.mjs`, delete this entire test (currently lines 57–67):

```js
test("multi_node_tp renders head + worker with total TP and rank substitution", () => {
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "multi_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 2, null);
  assert.equal(r.deployType, "multi_node");
  assert.equal(r.nodeCount, 2);
  // total TP = tp_by_hardware.h200 * nodeCount = 4*2 = 8; head rank 0, worker rank 1
  assert.ok(r.headCommand.includes("--tp 8"), r.headCommand);
  assert.ok(r.headCommand.includes("--nnodes 2"), r.headCommand);
  assert.ok(r.headCommand.includes("--node-rank 0"), r.headCommand);
  assert.ok(r.headCommand.includes("--dist-init-addr $HEAD_IP:5000"), r.headCommand);
  assert.ok(r.workerCommand.includes("--node-rank 1"), r.workerCommand);
});
```

In its place, insert these tests:

```js
test("derived multi-node: tp > gpu_count renders head/worker with upstream tp (default extra)", () => {
  // Block carries ONLY single_node_tp; the strategyName passed is single_node_tp,
  // yet tp(32) > gpu_count(8) ⇒ the adapter renders multi-node from MULTI_NODE_EXTRA.
  const block = { ...BLOCK, strategies: { single_node_tp: {} }, tp_by_hardware: { h100: 32 } };
  const recipe = { model: { model_id: "deepseek-ai/DeepSeek-V3" }, engines: { sglang: block } };
  const tax = { hardware_profiles: { h100: { gpu_count: 8, vram_gb: 640, brand: "NVIDIA", generation: "hopper" } } };
  const r = resolveCommandForEngine("sglang", recipe, "default", "single_node_tp", "h100", [], STRATEGIES, tax, [], 1, null);
  assert.equal(r.deployType, "multi_node");
  assert.equal(r.nodeCount, 4);           // ceil(32 / 8)
  assert.equal(r.tp, 32);                 // upstream value, NOT × nodes
  assert.ok(r.headCommand.includes("--tp 32"), r.headCommand);
  assert.ok(r.headCommand.includes("--nnodes 4"), r.headCommand);
  assert.ok(r.headCommand.includes("--node-rank 0"), r.headCommand);
  assert.ok(r.headCommand.includes("--dist-init-addr $HEAD_IP:5000"), r.headCommand);
  assert.ok(r.workerCommand.includes("--node-rank 1"), r.workerCommand);
});

test("derived multi-node: a block's explicit multi_node_tp.extra overrides the default", () => {
  const block = {
    ...BLOCK,
    strategies: { single_node_tp: {}, multi_node_tp: { extra: ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:9999"] } },
    tp_by_hardware: { h100: 16 },
  };
  const recipe = { model: { model_id: "deepseek-ai/DeepSeek-V3" }, engines: { sglang: block } };
  const tax = { hardware_profiles: { h100: { gpu_count: 8, vram_gb: 640, brand: "NVIDIA", generation: "hopper" } } };
  const r = resolveCommandForEngine("sglang", recipe, "default", "single_node_tp", "h100", [], STRATEGIES, tax, [], 1, null);
  assert.equal(r.nodeCount, 2);           // ceil(16 / 8)
  assert.ok(r.headCommand.includes("--dist-init-addr $HEAD_IP:9999"), r.headCommand);
});

test("the caller's nodeCount is ignored: tp <= gpu_count stays single-node", () => {
  // BLOCK.tp_by_hardware.h200 = 4, gpu_count 8 ⇒ single node even though nodeCount=2 is passed.
  const r = resolveCommandForEngine("sglang", RECIPE, "default", "single_node_tp", "h200", [], STRATEGIES, TAXONOMY, [], 2, null);
  assert.equal(r.deployType, "single_node");
  assert.equal(r.tp, 4);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: FAIL — the new "derived multi-node" tests fail because the current `synthesize` gates multi-node on `strategyName.startsWith("multi_node_") && nodeCount > 1`, so passing `single_node_tp` returns `single_node`.

- [ ] **Step 3: Rewrite `synthesize`**

In `src/lib/engines/sglang/index.js`, replace the entire `synthesize` function (currently lines 52–96, from the comment block through its closing brace) with:

```js
// Synthesize an SGLang launch command. Signature matches the EngineAdapter
// contract; vLLM-specific args (the strategies catalog, pdNodes) that SGLang
// doesn't use are accepted and ignored. The caller's nodeCount is ALSO ignored:
// node count is a consequence of (tp_by_hardware, gpu_count), derived here.
function synthesize(recipe, variantKey, strategyName, hwId, enabledFeatures, _strategies, taxonomy, advancedArgs = [], _nodeCount = 1, _pdNodes = null) {
  const block = recipe?.engines?.sglang;
  if (!block) throw new Error("sglang adapter: recipe has no engines.sglang block");
  const modelId = block.model_id || recipe.model?.model_id || "unknown";
  const serveBinary = block.serve_binary || "python3 -m sglang.launch_server";

  const featureArgs = [];
  for (const f of enabledFeatures || []) {
    const fa = block.features?.[f]?.args;
    if (fa) featureArgs.push(...fa);
  }

  const { tp, nodes } = deriveSglangNodes(block, hwId, taxonomy);

  if (nodes > 1) {
    // Derived multi-node. A block may pin its own dist flags via
    // strategies.multi_node_tp.extra (the explicit upstream path); otherwise the
    // adapter default applies. tp is the upstream value — never × nodes.
    const extra = block.strategies?.multi_node_tp?.extra ?? MULTI_NODE_EXTRA;
    const headArgs = buildArgs(block, tp, extra, { nnodes: nodes, rank: 0 }, featureArgs, advancedArgs);
    const workerArgs = buildArgs(block, tp, extra, { nnodes: nodes, rank: 1 }, featureArgs, advancedArgs);
    return {
      deployType: "multi_node",
      nodeCount: nodes,
      tp,
      headCommand: formatCommand(serveBinary, modelId, headArgs),
      workerCommand: formatCommand(serveBinary, modelId, workerArgs),
      headArgv: formatArgv(serveBinary, modelId, headArgs),
      workerArgv: formatArgv(serveBinary, modelId, workerArgs),
      env: {},
    };
  }

  const strat = block.strategies?.[strategyName] || block.strategies?.single_node_tp || {};
  const args = buildArgs(block, tp, strat.extra, { nnodes: 1, rank: 0 }, featureArgs, advancedArgs);
  return {
    deployType: "single_node",
    tp,
    command: formatCommand(serveBinary, modelId, args),
    argv: formatArgv(serveBinary, modelId, args),
    env: {},
  };
}
```

- [ ] **Step 4: Run the full adapter test file to verify it passes**

Run: `node --test src/lib/engines/sglang/sglang.test.mjs`
Expected: PASS — all tests, including the three new derived-multi tests, the `deriveSglangNodes` tests from Task 1, and the unchanged single-node/capabilities tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/sglang/index.js src/lib/engines/sglang/sglang.test.mjs
git commit -s -m "SGLang adapter: derive multi-node from tp vs gpu_count, ignore caller nodeCount"
```

---

## Task 3: Drop the transformer's inert `nodes:multi` branch

**Files:**
- Modify: `src/lib/engines/sglang-transform.js` (remove `MULTI_NODE_EXTRA` at lines 18-19; remove `hasMulti` at line 50; remove the `nodes === "multi"` scan at line 60; remove the attachment at line 63)
- Test: `src/lib/engines/sglang-transform.test.mjs`

- [ ] **Step 1: Replace the transformer test**

In `src/lib/engines/sglang-transform.test.mjs`, delete this test (currently lines 40–49):

```js
test("modelToBlock adds multi_node_tp when any config is nodes:multi", () => {
  const m = { ...MODEL, hardware: { B200: { configurations: [
    { name: "default", attributes: { nodes: "multi", quantization: "fp8" }, engine: { tp: 16, extra_args: [] } },
  ] } } };
  const b = modelToBlock(m, "v0.5.10");
  assert.ok(b.strategies.multi_node_tp, "multi_node_tp present");
  assert.deepEqual(b.strategies.multi_node_tp.extra, ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"]);
  assert.equal(b.variants.default.precision, "fp8");
  assert.deepEqual(b.tp_by_hardware, { b200: 16 });
});
```

In its place, insert:

```js
test("modelToBlock never emits multi_node_tp, even for nodes:multi (derived at render)", () => {
  const m = { ...MODEL, hardware: { B200: { configurations: [
    { name: "default", attributes: { nodes: "multi", quantization: "fp8" }, engine: { tp: 16, extra_args: [] } },
  ] } } };
  const b = modelToBlock(m, "v0.5.10");
  assert.equal(b.strategies.multi_node_tp, undefined);    // multi-node is derived by the adapter, not the block
  assert.deepEqual(b.strategies.single_node_tp, {});
  assert.equal(b.variants.default.precision, "fp8");
  assert.deepEqual(b.tp_by_hardware, { b200: 16 });       // tp is still captured faithfully
});
```

- [ ] **Step 2: Run the transformer tests to verify the new test fails**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: FAIL — the current code still attaches `strategies.multi_node_tp` for a `nodes:multi` config, so `assert.equal(b.strategies.multi_node_tp, undefined)` fails.

- [ ] **Step 3: Remove `MULTI_NODE_EXTRA` and its attachment**

In `src/lib/engines/sglang-transform.js`, delete these two lines (currently 18–19):

```js
// Multi-node TP flag template; {NNODES}/{RANK} are filled by the sglang adapter.
const MULTI_NODE_EXTRA = ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"];
```

Delete this line inside `modelToBlock` (currently line 50):

```js
  let hasMulti = false;
```

Delete this line inside the `for` loop (currently line 60):

```js
    if (configs.some((c) => c?.attributes?.nodes === "multi")) hasMulti = true;
```

Delete this line after the loop (currently line 63):

```js
  if (hasMulti) block.strategies.multi_node_tp = { extra: MULTI_NODE_EXTRA };
```

Also update the file's P2a header comment (lines 5–6) which references the now-removed behavior:

```js
 * P2a scope: TP only. Uses each hardware's `default` named configuration;
 * dp/ep/PD/speculative (non-default) configs are ignored.
```

Replace with:

```js
 * Scope: TP only. Uses each hardware's `default` named configuration;
 * dp/ep/PD/speculative (non-default) configs are ignored. Multi-node is NOT
 * encoded here — the SGLang adapter derives it at render time from
 * tp_by_hardware vs the hardware's gpu_count.
```

- [ ] **Step 4: Run the transformer tests to verify they pass**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: PASS — including the unchanged "single-node" test that already asserts `b.strategies.multi_node_tp === undefined`.

- [ ] **Step 5: Regenerate the generated blocks and verify NO diff**

The vendored upstream already exists (`upstream/sglang/`), so regenerate without re-fetching:

Run: `node scripts/sync-sglang.mjs && git status --porcelain engines/sglang`
Expected: prints the sync summary line and **no** `engines/sglang/...` entries in `git status` (no generated block carried `multi_node_tp`, so output is byte-identical).

- [ ] **Step 6: Guard the JSON API golden**

Run: `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs`
Expected: build prints `✓ JSON API: N models, 7 strategies`; snapshot prints a pass (no diff). The golden is unchanged because the embedded SGLang blocks are unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/sglang-transform.js src/lib/engines/sglang-transform.test.mjs
git commit -s -m "Drop transformer nodes:multi branch — multi-node is derived at render"
```

---

## Task 4: CommandBuilder UI — hide Nodes/Strategy rows and read node count from the result

**Files:**
- Modify: `src/components/recipes/CommandBuilder.jsx` (config-summary header ~1037-1043; Strategy row ~1547-1586; Nodes row ~1588-1658)

This file has no unit-test harness; verify with `pnpm lint` plus a manual dev-server check (Step 6). Make all four edits, then verify together.

- [ ] **Step 1: Derive the config-summary node multiplier from `result.nodeCount`**

Find (currently line 1038):

```jsx
  const hwPart = nodeCount > 1 ? `${nodeCount}× ${hwDisplay}` : hwDisplay;
```

Replace with:

```jsx
  // For non-vLLM engines the Nodes row is hidden and the component `nodeCount`
  // state stays 1; the adapter is the source of truth, so read result.nodeCount.
  const summaryNodes = engine === "vllm" ? nodeCount : (result.nodeCount || 1);
  const hwPart = summaryNodes > 1 ? `${summaryNodes}× ${hwDisplay}` : hwDisplay;
```

- [ ] **Step 2: Use `result.nodeCount` in the `summaryTp` fallback**

Find (currently line 1043):

```jsx
    : (result.tp ?? (hwProfile?.gpu_count || 1) * (result.deployType === "multi_node" ? nodeCount : 1));
```

Replace with:

```jsx
    : (result.tp ?? (hwProfile?.gpu_count || 1) * (result.deployType === "multi_node" ? (result.nodeCount || 1) : 1));
```

- [ ] **Step 3: Hide the Strategy row for a non-vLLM engine with ≤1 strategy**

Find the Strategy row opening (currently lines 1547–1549):

```jsx
          {/* Strategy */}
          <ConfigRow label="Strategy">
            <PillGroup>
```

Replace with:

```jsx
          {/* Strategy — hidden for a non-vLLM engine exposing a single strategy
              (SGLang's lone single_node_tp), which would otherwise mislabel a
              derived multi-node command. vLLM is unaffected. */}
          {(engine === "vllm" || compatibleStrategies.length > 1) && (
          <ConfigRow label="Strategy">
            <PillGroup>
```

Then find the Strategy row close (currently lines 1584–1588 — the orientation IIFE close, the `</ConfigRow>`, then the Nodes comment):

```jsx
            })()}
          </ConfigRow>

          {/* Nodes — two number inputs for PD (one per pool), pills otherwise */}
```

Replace with:

```jsx
            })()}
          </ConfigRow>
          )}

          {/* Nodes — two number inputs for PD (one per pool), pills otherwise */}
```

- [ ] **Step 4: Hide the Nodes row for non-vLLM engines**

Find the Nodes row opening (the comment + ternary, just produced by Step 3's replacement):

```jsx
          {/* Nodes — two number inputs for PD (one per pool), pills otherwise */}
          {activeStrategy === "pd_cluster" ? (
```

Replace with:

```jsx
          {/* Nodes — vLLM only. SGLang derives node count from tp vs gpu_count,
              so it's a consequence (not a choice); it surfaces via the
              config-summary header + Head/Worker command tabs. */}
          {engine === "vllm" && (activeStrategy === "pd_cluster" ? (
```

Then find the Nodes row close (currently lines 1656–1660 — the non-PD ConfigRow close, then the Features comment):

```jsx
              </PillGroup>
            </ConfigRow>
          )}

          {/* Features */}
```

Replace with:

```jsx
              </PillGroup>
            </ConfigRow>
          ))}

          {/* Features */}
```

- [ ] **Step 5: Lint to verify the JSX is well-formed**

Run: `pnpm lint`
Expected: no new errors for `src/components/recipes/CommandBuilder.jsx` (no unbalanced-JSX / parse errors). Pre-existing warnings elsewhere are unrelated.

- [ ] **Step 6: Manual verification in the running dev server**

Do NOT restart the dev server — Next HMR picks up the edit. Open a recipe with an oversized-TP SGLang block, e.g. `http://localhost:3000/zai-org/GLM-5.1`, and switch the Engine pill to **SGLang**. Confirm:
- The **Nodes** row is gone and the **Strategy** row is gone.
- On H100 the command header reads `4× H100 · TP=32 · BF16` with **Head** / **Node 1** command tabs; the Head command shows `--tp 32 --nnodes 4 --node-rank 0 --dist-init-addr $HEAD_IP:5000`.
- Switching hardware to H200 re-renders `2× H200 · TP=16 · BF16` (2 tabs); B200 likewise 2 nodes.
- The vLLM engine tab still shows the Nodes (1 / 2) toggle and the Strategy row, unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/recipes/CommandBuilder.jsx
git commit -s -m "CommandBuilder: hide Nodes/Strategy rows for SGLang; read node count from adapter result"
```

---

## Task 5: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `node --test`
Expected: all test files pass (engine-ui, types, sglang-transform, capabilities, sglang-join, engines, sglang, blocks).

- [ ] **Step 2: Re-confirm the generated tree and golden are clean**

Run: `node scripts/sync-sglang.mjs && node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && git status --porcelain engines/sglang public`
Expected: build prints `✓ JSON API: …`; snapshot passes; `git status` shows no tracked changes under `engines/sglang` (and `public/` stays untracked/ignored).

- [ ] **Step 3: Lint the whole project**

Run: `pnpm lint`
Expected: passes (no new errors).

- [ ] **Step 4: Confirm the working tree is committed**

Run: `git status`
Expected: clean (all changes from Tasks 1–4 already committed). If anything remains, commit it with `git commit -s`.

---

## Self-Review

**Spec coverage:**
- Core rule `nodes = ceil(tp/gpu_count)`, tp unchanged → Task 1 (`deriveSglangNodes`) + Task 2 (`synthesize`).
- Adapter ignores caller `nodeCount`; no `strategyName` gate → Task 2 (`_nodeCount` param, derived branch).
- Move `MULTI_NODE_EXTRA` to adapter; block `extra` overrides → Task 1 (constant) + Task 2 (override lookup) + Task 3 (removal from transformer).
- Multi-node return shape (head rank 0 / worker rank 1, tp not ×nodes) → Task 2.
- Transformer drops `nodes:multi` branch → Task 3.
- Hide Nodes row (non-vLLM) → Task 4 Step 4.
- Hide Strategy row (≤1 strategy, vLLM unaffected) → Task 4 Step 3.
- Config-summary `N×` from `result.nodeCount` → Task 4 Steps 1–2.
- Worker tip for N>2 → satisfied by the existing `MultiNodeBlock` footer (lines 2165–2168); no new code (noted).
- Edge cases (missing tp, non-divisible) → Task 1 tests.
- `capabilities()` unchanged / doesn't gate SGLang UI → no task needed (UI keys off `result`); covered by unchanged capabilities tests.
- Golden guard → Task 3 Step 6 + Task 5 Step 2.

**Placeholder scan:** none — every code step shows full content.

**Type consistency:** `deriveSglangNodes(block, hwId, taxonomy) → { tp, nodes, gpuCount }` is defined in Task 1 and consumed identically in Task 2. `result.nodeCount` / `result.tp` / `result.deployType` match the adapter's return object across Tasks 2 and 4. `MULTI_NODE_EXTRA` is the same array in Task 1 (added to adapter) and Task 3 (removed from transformer).
