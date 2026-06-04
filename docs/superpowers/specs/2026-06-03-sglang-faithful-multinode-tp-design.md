# SGLang Faithful Multi-Node TP — Design

**Date:** 2026-06-03
**Status:** Approved
**Depends on:** P2a (`2026-06-03-sglang-transformer-p2a-design.md`) — the vendored upstream + generated `engines/sglang/<org>/<repo>.yaml` blocks and the SGLang adapter seam.

## Problem

Some SGLang models specify a per-hardware tensor-parallel size that exceeds a
single node's GPU count. Example — `engines/sglang/zai-org/GLM-5.1.yaml`:

```yaml
tp_by_hardware: { h100: 32, h200: 16, b200: 16 }
strategies: { single_node_tp: {} }
```

Taxonomy `gpu_count` for `h100`/`h200`/`b200` is **8**. So `h100: tp=32` is
physically a **4-node** deployment and `tp=16` a **2-node** one. Today all three
render as a single-node `python3 -m sglang.launch_server … --tp 32`, which is
not runnable.

Two concrete defects in `src/lib/engines/sglang/index.js`:

1. The single-node branch emits `--tp 32` on an 8-GPU box with no `--nnodes` /
   head-worker split.
2. The multi-node branch (currently unreachable — see below) computes
   `tp = tp_by_hardware × nodeCount`, which would double the already-total TP
   (`32 × 2 = 64`).

The multi-node branch is also dead code: it is gated on
`strategyName.startsWith("multi_node_") && nodeCount > 1`, but generated blocks
carry only `single_node_tp` (upstream marks every config `nodes: single`), and
`engineSources` defaults SGLang's strategy to `single_node_tp`. The transformer
only attaches a `multi_node_tp` strategy when upstream sets `nodes: multi`,
which never happens (inert branch, commit a697131).

## Core rule

`tp_by_hardware[hw]` is upstream ground truth. The adapter derives node count at
render time against the live taxonomy `gpu_count`:

```
tp    = block.tp_by_hardware[hwId] ?? gpu_count        // upstream value, unchanged
nodes = max(1, ceil(tp / gpu_count))                   // gpu_count from taxonomy
```

`nodes > 1` → multi-node (head + worker). Otherwise single-node. `tp` is always
the upstream value — never multiplied by node count.

This keeps the block a pure `tp_by_hardware` mirror of upstream and makes the
"is this multi-node?" decision a single render-time computation against the one
authoritative source of `gpu_count` (taxonomy). If a hardware profile's
`gpu_count` is ever corrected, derived node counts follow automatically.

## Components

### 1. Adapter — `src/lib/engines/sglang/index.js`

- **New exported pure helper** `deriveSglangNodes(block, hwId, taxonomy)` →
  `{ tp, nodes, gpuCount }`. Single owner of the `ceil(tp / gpu_count)` rule;
  exported for direct unit testing.
- `synthesize` **ignores the incoming `nodeCount` parameter** for SGLang and
  derives its own node count. Node count is a consequence of `(hardware, tp)`,
  not a user choice.
- **Move `MULTI_NODE_EXTRA`** (`--nnodes {NNODES} --node-rank {RANK}
  --dist-init-addr $HEAD_IP:5000`) from the transformer into the adapter as a
  constant. When `nodes > 1`, the strategy extra is
  `block.strategies.multi_node_tp?.extra ?? MULTI_NODE_EXTRA` — an explicit
  upstream `nodes: multi` block (future) still wins; the derived path works with
  zero block changes.
- Multi-node return shape (unchanged keys): `deployType: "multi_node"`,
  `nodeCount: nodes`, `tp` (upstream value, **not** `× nodes`), `headCommand` /
  `workerCommand` (+ `headArgv` / `workerArgv`) for rank 0 and rank 1 — a
  Head + single-Worker example even when `nodes` is 4, mirroring vLLM's
  two-command multi-node display. `env: {}`.

### 2. Transformer — `src/lib/engines/sglang-transform.js`

- Delete `MULTI_NODE_EXTRA` and its attachment (adapter now owns the template).
- **Drop the `nodes: multi` branch entirely.** The derived rule subsumes it; the
  inert `strategies.multi_node_tp` emission is removed. Blocks stay a pure
  `tp_by_hardware` mirror — no `multi_node_tp` strategy is generated.
  (`hasMulti` / the `attributes.nodes === "multi"` scan go away.)

### 3. UI — `src/components/recipes/CommandBuilder.jsx`

- **Hide the Nodes row when `engine !== "vllm"`.** Node count surfaces through
  the config-summary header and the Head / Worker command tabs instead. vLLM's
  existing `[1, 2]` toggle is untouched.
- **Hide the Strategy row when `compatibleStrategies.length <= 1`.** This is the
  SGLang case today (lone `single_node_tp`) and removes the "Single Node TP"
  label that would otherwise sit above a multi-node command. vLLM (multiple
  strategies) is unaffected.
- **Config-summary header:** for non-vLLM engines, derive the `N×` multiplier
  from `result.nodeCount` rather than the component `nodeCount` state (which
  stays 1 since the Nodes row is hidden). `summaryTp` and `isMultiNode` already
  read `result.*`, so the Head / Worker tabs light up automatically. Result for
  GLM-5.1 on H100: header `4× H100 · TP=32 · BF16`, Head + Worker (node 1) tabs.
- **Worker tip:** when `result.nodeCount > 2`, show a one-line note near the
  Worker tab — replicate the worker command for ranks `1 … N-1` (incrementing
  `--node-rank`). Mirrors the existing vLLM multi-node tooltip guidance.

## Edge cases

- `tp_by_hardware[hw]` absent → `tp = gpu_count`, `nodes = 1`. Preserves current
  single-node behavior for hardware the upstream config doesn't list.
- `tp` not divisible by `gpu_count` (rare; values are almost always powers of
  two) → `ceil` rounds up. The command faithfully renders the upstream `tp`
  (some GPUs on the last node idle). Reflected, not "fixed".
- `capabilities(recipe)` has no taxonomy argument, so it cannot derive
  `multiNode`. It is left reporting explicit-strategy presence (always `false`
  now that no `multi_node_tp` strategy is generated). This does **not** gate the
  SGLang UI — the UI keys off `result.deployType` — so it is harmless. Noted for
  future readers; a taxonomy-aware capability is out of scope.

## Testing

- **`deriveSglangNodes`** (`sglang/sglang.test.mjs` or a sibling): tp > gpu
  (multi, exact divisor), tp == gpu (single), tp < gpu (single), tp missing
  (fallback to gpu_count → single), tp not divisible by gpu (ceil rounds up).
- **`synthesize` SGLang multi-node**: GLM-5.1 `h100` → `nodeCount: 4`,
  `--tp 32`, head `--node-rank 0`, worker `--node-rank 1`, `--nnodes 4`,
  `--dist-init-addr $HEAD_IP:5000` present in both; `h200` → `nodeCount: 2`,
  `--tp 16`; a single-node hardware/model still returns `deployType:
  "single_node"` with the upstream `--tp` and no dist flags.
- **Block override path**: a synthetic block with an explicit
  `strategies.multi_node_tp.extra` uses that array instead of the adapter
  default.
- **UI helper**: if the ≤1-strategy hide is extracted into `engine-ui.js`,
  cover it there; otherwise assert via the existing component-source tests.
- **Golden**: rebaseline with `node scripts/build-recipes-api.mjs &&
  node scripts/snapshot-api.mjs`. Generated SGLang command blocks for the
  oversized-TP models (GLM-5, GLM-5.1, Qwen3.5-397B-A17B) now render head/worker
  multi-node commands.

## Out of scope

- SGLang dp / ep / PD / speculative configs (still P2a-deferred).
- Upstream `nodes: multi` provenance (the explicit path remains *supported* by
  the adapter override but is not *generated*; no upstream config sets it yet).
- A taxonomy-aware `capabilities()` rework.
