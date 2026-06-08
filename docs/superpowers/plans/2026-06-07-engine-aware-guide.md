# Engine-Aware Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the recipe detail page's Guide section reflect the selected engine — vLLM guide under vLLM (unchanged), a hand-authored SGLang guide under SGLang, and an honest fallback notice when no SGLang guide exists yet.

**Architecture:** Hand-authored SGLang guides live in a separate `engines/sglang-guides/<org>/<repo>.md` tree (never touched by `sync-sglang.mjs`). The existing `attachEngines` join reads the `.md` into `recipe.engines.sglang.guide` (covering both the live server and the JSON API). A new thin client component `EngineAwareGuide` reads the `?engine=` URL param and renders the right markdown via a pure `pickGuide(engine, recipe)` helper, or the fallback notice.

**Tech Stack:** Node.js ESM, `node --test`, Next.js/React (App Router), react-markdown + remark-gfm + rehype-slug, js-yaml.

**Spec:** `docs/superpowers/specs/2026-06-07-engine-aware-guide-design.md`

---

## File Structure

- **Create** `src/lib/guide.js` — pure `pickGuide(engine, recipe)` selection helper.
- **Create** `src/lib/guide.test.mjs` — unit tests for `pickGuide`.
- **Create** `engines/sglang-guides/zai-org/GLM-5.1.md` — the one authored exemplar SGLang guide.
- **Modify** `src/lib/engines/sglang-join.js` — read `engines/sglang-guides/<hfId>.md` into `block.guide`.
- **Modify** `src/lib/engines/sglang-join.test.mjs` — assert guide attach (GLM-5.1) and no-guide (DeepSeek-V3.2).
- **Create** `src/components/recipes/EngineAwareGuide.jsx` — client component: engine-aware guide render + fallback.
- **Modify** `src/app/[org]/[repo]/page.js` — swap inline guide render for `<EngineAwareGuide>`; drop now-unused markdown imports + `const guide`.
- **Rebaseline** `scripts/__tests__/api-golden.json` — GLM-5.1 JSON gains `engines.sglang.guide`.

---

## Task 1: `pickGuide` pure helper

**Files:**
- Create: `src/lib/guide.js`
- Test: `src/lib/guide.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/guide.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/guide.test.mjs`
Expected: FAIL — `pickGuide` is not defined (cannot import from `./guide.js`).

- [ ] **Step 3: Write the implementation**

Create `src/lib/guide.js`:

```js
/**
 * Pick the guide markdown to render for the active engine, or null when that
 * engine has no guide (the caller renders a fallback). vLLM (and an absent
 * engine) uses the recipe's top-level `guide`; any other engine uses
 * `recipe.engines[engine].guide`. Pure — no React, no IO.
 */
export function pickGuide(engine, recipe) {
  if (!engine || engine === "vllm") return recipe?.guide || null;
  return recipe?.engines?.[engine]?.guide || null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/guide.test.mjs`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/guide.js src/lib/guide.test.mjs
git commit -s -m "Add pickGuide helper: engine-aware guide selection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Author the GLM-5.1 SGLang guide

**Files:**
- Create: `engines/sglang-guides/zai-org/GLM-5.1.md`

This task creates content only (no code). It also serves as the on-disk fixture for Task 3's join test.

- [ ] **Step 1: Create the guide file**

Create `engines/sglang-guides/zai-org/GLM-5.1.md` with exactly this content:

```markdown
## Overview

GLM-5.1 is a 744B-parameter frontier MoE model from Z-AI. This guide covers
serving it with **SGLang**. Both BF16 (`zai-org/GLM-5.1`) and native FP8
(`zai-org/GLM-5.1-FP8`) checkpoints are published; FP8 fits on a single
8×H200 node, BF16 requires multi-node tensor parallelism.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- **DeepGEMM (FP8):** required for best FP8 performance.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path zai-org/GLM-5.1-FP8 \
  --trust-remote-code --tp 8 \
  --tool-call-parser glm47 --reasoning-parser glm45
```

## Launching the server

### FP8 on a single 8×H200 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1-FP8 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm47 \
  --reasoning-parser glm45
```

### BF16 multi-node (tensor parallel across nodes)

BF16 weights exceed a single node, so tensor parallelism spans multiple nodes.
On H200/B200 (8 GPU/node) this is `--tp 16` over 2 nodes; on H100 it is
`--tp 32` over 4 nodes. Set `$HEAD_IP` to the rank-0 node's address and launch
the same command on every node, incrementing `--node-rank`:

```bash
# Head (rank 0) — 4-node H100 example
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1 \
  --trust-remote-code \
  --tp 32 \
  --nnodes 4 --node-rank 0 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser glm47 --reasoning-parser glm45

# Worker — replicate on nodes 1..3 with --node-rank 1, 2, 3
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1 \
  --trust-remote-code \
  --tp 32 \
  --nnodes 4 --node-rank 1 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser glm47 --reasoning-parser glm45
```

The interactive command builder above renders the exact head/worker commands
for your selected hardware.

## Features

- **Tool calling:** `--tool-call-parser glm47`
- **Reasoning (thinking mode):** `--reasoning-parser glm45`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-5.1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-5.1)
- [FP8 checkpoint](https://huggingface.co/zai-org/GLM-5.1-FP8)
- [SGLang docs](https://docs.sglang.ai)
```

- [ ] **Step 2: Verify the file is valid markdown and on disk**

Run: `test -f engines/sglang-guides/zai-org/GLM-5.1.md && head -1 engines/sglang-guides/zai-org/GLM-5.1.md`
Expected: prints `## Overview`.

- [ ] **Step 3: Commit**

```bash
git add engines/sglang-guides/zai-org/GLM-5.1.md
git commit -s -m "Author SGLang guide for zai-org/GLM-5.1 (exemplar)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Join reads the SGLang guide tree

**Files:**
- Modify: `src/lib/engines/sglang-join.js`
- Test: `src/lib/engines/sglang-join.test.mjs`
- Rebaseline: `scripts/__tests__/api-golden.json`

- [ ] **Step 1: Write the failing tests**

In `src/lib/engines/sglang-join.test.mjs`, add these two tests after the existing ones:

```js
test("attachEngines reads an authored SGLang guide into engines.sglang.guide", () => {
  const recipe = { hf_id: "zai-org/GLM-5.1", model: { model_id: "zai-org/GLM-5.1", min_vllm_version: "0.19.1" } };
  const out = attachEngines(recipe);
  assert.equal(typeof out.engines.sglang.guide, "string");
  assert.ok(out.engines.sglang.guide.includes("sglang.launch_server"), "guide carries the launch command prose");
});

test("attachEngines leaves guide unset when no authored SGLang guide exists", () => {
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V3.2", model: { model_id: "deepseek-ai/DeepSeek-V3.2", min_vllm_version: "0.11.1" } };
  const out = attachEngines(recipe);
  assert.ok(out.engines.sglang, "sglang block still attached");
  assert.equal(out.engines.sglang.guide, undefined);
});
```

(These rely on the real on-disk tree, mirroring the existing tests: `engines/sglang-guides/zai-org/GLM-5.1.md` exists from Task 2; `deepseek-ai/DeepSeek-V3.2` has a block but no guide file.)

- [ ] **Step 2: Run the tests to verify the first fails**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: FAIL — the GLM-5.1 test fails because `attachEngines` doesn't read the guide tree yet (`out.engines.sglang.guide` is `undefined`). The DeepSeek test passes already.

- [ ] **Step 3: Extend `attachEngines`**

In `src/lib/engines/sglang-join.js`, the current top has:

```js
const SGLANG_DIR = path.join(process.cwd(), "engines", "sglang");
```

Add a second constant right after it:

```js
const SGLANG_GUIDES_DIR = path.join(process.cwd(), "engines", "sglang-guides");
```

Then, inside `attachEngines`, find this block:

```js
  const block = yaml.load(fs.readFileSync(blockPath, "utf8"));
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
```

Replace it with:

```js
  const block = yaml.load(fs.readFileSync(blockPath, "utf8"));
  // Hand-authored SGLang guides live in a separate tree (sync-sglang.mjs never
  // writes there, so they survive upstream re-syncs). Merge onto the block when
  // present; absent leaves block.guide unset and the UI shows a fallback notice.
  const guidePath = path.join(SGLANG_GUIDES_DIR, `${hfId}.md`);
  if (fs.existsSync(guidePath)) {
    block.guide = fs.readFileSync(guidePath, "utf8");
  }
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: PASS — all tests, including the two new ones.

- [ ] **Step 5: Rebaseline the JSON API golden**

The GLM-5.1 recipe JSON now embeds `engines.sglang.guide`. This is an intended golden change.

Run: `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs`
Expected: snapshot FAILS, reporting a diff in `zai-org/GLM-5.1.json` (the file hash changed).

Then rebaseline the golden and confirm the change is GLM-5.1-only:

Run: `node scripts/snapshot-api.mjs --write && git diff scripts/__tests__/api-golden.json`
Expected: the only changed hash line(s) in `api-golden.json` correspond to `zai-org/GLM-5.1.json` (the parent recipe). No other model's hash changes. (`build-recipes-api.mjs` was just run above, so `public/` is already current — no need to rebuild before `--write`.)

- [ ] **Step 6: Verify the golden now passes**

Run: `node scripts/snapshot-api.mjs`
Expected: `✓ API output matches golden (...)`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/sglang-join.js src/lib/engines/sglang-join.test.mjs scripts/__tests__/api-golden.json
git commit -s -m "Join: attach authored SGLang guide (engines/sglang-guides) to the recipe

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `EngineAwareGuide` client component + page wiring

**Files:**
- Create: `src/components/recipes/EngineAwareGuide.jsx`
- Modify: `src/app/[org]/[repo]/page.js`

This file has no unit-test harness; verify with the running dev server (Step 5).

- [ ] **Step 1: Create the client component**

Create `src/components/recipes/EngineAwareGuide.jsx`:

```jsx
"use client";

import { useSearchParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { pickGuide } from "@/lib/guide";

// Engine-aware Guide body. Reads the same ?engine= param CommandBuilder uses so
// the guide toggles instantly with the Engine pill. Renders the active engine's
// guide markdown, or — for a non-vLLM engine that has no authored guide yet — a
// short notice instead of (misleadingly) the vLLM guide.
export function EngineAwareGuide({ recipe, defaultEngine = "vllm" }) {
  const searchParams = useSearchParams();
  const engine = searchParams.get("engine") || defaultEngine || "vllm";
  const md = pickGuide(engine, recipe);

  if (md) {
    return (
      <div className="guide-content">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {md}
        </Markdown>
      </div>
    );
  }

  if (engine !== "vllm") {
    const label = engine.charAt(0).toUpperCase() + engine.slice(1);
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        No {label}-specific guide yet for this model — the command above is the
        authoritative setup. Switch the Engine pill to vLLM for that engine&apos;s
        full guide.
      </p>
    );
  }

  return null;
}
```

- [ ] **Step 2: Wire it into the page — imports**

In `src/app/[org]/[repo]/page.js`, remove these three now-unused imports (lines 14–16):

```js
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
```

And add this import alongside the other component imports (after the `CommandBuilder` import on line 11):

```js
import { EngineAwareGuide } from "@/components/recipes/EngineAwareGuide";
```

- [ ] **Step 3: Wire it into the page — render + remove dead local**

In `src/app/[org]/[repo]/page.js`, remove this now-unused line (currently line 83):

```js
  const guide = recipe.guide || "";
```

Then find the guide render block (currently lines 214–225):

```jsx
        {guide && (
          <Accordion title="Guide" defaultOpen>
            <div className="guide-content">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
              >
                {guide}
              </Markdown>
            </div>
          </Accordion>
        )}
```

Replace it with:

```jsx
        {(recipe.guide || recipe.engines?.sglang?.guide) && (
          <Accordion title="Guide" defaultOpen>
            <EngineAwareGuide recipe={recipe} defaultEngine={recipe.default_engine || "vllm"} />
          </Accordion>
        )}
```

- [ ] **Step 4: Confirm the build/API still generates and tests pass**

Run: `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && node --test`
Expected: build prints `✓ JSON API: …`; snapshot matches golden; `node --test` all pass. (The page component isn't exercised by these, but this confirms no import/JSON regression and the helper/join tests are green.)

- [ ] **Step 5: Manual verification in the running dev server**

Do NOT restart the dev server (HMR picks up the change). Verify:
- `http://localhost:3000/zai-org/GLM-5.1` — Guide shows the vLLM guide on the vLLM pill; switching to **SGLang** shows the authored SGLang guide (starts with "Overview … serving it with SGLang"); switching back to vLLM restores the vLLM guide. Toggle is instant (no full reload).
- `http://localhost:3000/Qwen/Qwen3-235B-A22B-Instruct-2507` (has an SGLang block, no authored guide) — SGLang pill shows the fallback notice ("No SGLang-specific guide yet …"); vLLM pill shows its normal guide.
- Any vLLM-only recipe (no `engines`, e.g. a small dense model) — Guide renders exactly as before, no Engine pill.

- [ ] **Step 6: Commit**

```bash
git add src/components/recipes/EngineAwareGuide.jsx src/app/[org]/[repo]/page.js
git commit -s -m "Render the Guide per selected engine (EngineAwareGuide); SGLang fallback notice

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `node --test`
Expected: all pass (includes `guide.test.mjs`, `sglang-join.test.mjs`, and the existing suite).

- [ ] **Step 2: Build + golden + clean tree**

Run: `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs && git status --porcelain`
Expected: build prints `✓ JSON API: …`; snapshot matches golden; `git status` shows no tracked changes beyond commits (untracked `public/` and `.playwright-mcp/` are fine).

- [ ] **Step 3: Confirm sync safety**

Run: `node scripts/sync-sglang.mjs && git status --porcelain engines/sglang engines/sglang-guides`
Expected: `engines/sglang/` may regenerate identically (no diff); `engines/sglang-guides/` is NOT touched by sync (no diff). Confirms the authored guide is clobber-safe.

---

## Self-Review

**1. Spec coverage:**
- Authored guides in a separate tree → Task 2 (file) + Task 3 (join reads it).
- Join merges into `recipe.engines.sglang.guide` on both server + JSON → Task 3 (single `attachEngines` change; `lib/recipes.js` and `build-recipes-api.mjs` both call it).
- Client engine-aware render + fallback notice → Task 4 (`EngineAwareGuide`) using `pickGuide` → Task 1.
- Fallback only for non-vLLM with no guide; vLLM unchanged; single-engine unchanged → Task 4 component logic + the `(recipe.guide || recipe.engines?.sglang?.guide)` gate.
- Exemplar GLM-5.1 → Task 2.
- Golden rebaseline (intended change) → Task 3 Step 5.
- Tests: `pickGuide` (Task 1), join attach/no-attach (Task 3), manual (Task 4), full suite (Task 5).
- `sync-sglang` never writes the guide tree → Task 5 Step 3.

**2. Placeholder scan:** No TBD/TODO. Task 3 Step 5 has a clarifying aside about `public/` cleanliness; the actionable command (`build && snapshot --write && git diff --stat`) is concrete. Every code step shows full content.

**3. Type consistency:** `pickGuide(engine, recipe)` defined in Task 1 is consumed identically in Task 4. `block.guide` set in Task 3 is the field `pickGuide` reads via `recipe.engines.sglang.guide` and the page gate checks via `recipe.engines?.sglang?.guide`. `EngineAwareGuide` props `{recipe, defaultEngine}` match the call site in Task 4 Step 3. The fallback wording matches the spec.
