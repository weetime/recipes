# Engine-Aware (Dual-Engine) Guide — Design

**Date:** 2026-06-07
**Status:** Approved
**Depends on:** the engine adapter seam + switcher (PRs #1–#4) and SGLang faithful multi-node TP (PR #5). The Engine pill and `?engine=` URL param already exist.

## Problem

The recipe detail page renders a single `guide` markdown block (`src/app/[org]/[repo]/page.js`, ~lines 214–225) authored for vLLM (vLLM version, `docker run vllm/vllm-openai`, `uv pip install vllm`, FP8/MTP notes). When the user switches the Engine pill to SGLang, the command builder updates but the guide below does not — it keeps showing vLLM-specific install/docker prose, which is misleading under SGLang. The guide is a **server**-rendered sibling of the (client) `CommandBuilder`, so it can't react to the client-side engine toggle, and no SGLang guide content exists anywhere (the vendored upstream snapshot carries only a one-line family `description`, no prose).

## Goals

- The Guide section reflects the selected engine: vLLM guide under vLLM (unchanged), an SGLang-specific guide under SGLang.
- SGLang guide prose is hand-authored, lives outside the generated `engines/sglang/` tree (clobber-safe across `sync-sglang.mjs` re-syncs), and is merged onto the recipe by the existing join.
- When SGLang is selected but no guide is authored yet, show an honest fallback notice — never vLLM prose under SGLang.
- Ship the mechanism + one real exemplar guide (`zai-org/GLM-5.1`); the other ~24 SGLang models show the fallback until authored later (pure content PRs).
- vLLM behavior and single-engine recipes are byte-identical to today.

## Non-goals

- Authoring SGLang guides for models other than GLM-5.1 (incremental, later).
- Synthesizing guide content from structured fields.
- Engine-aware anything outside the Guide section (the command builder is already engine-aware).

## Architecture & data flow

```
engines/sglang-guides/<org>/<repo>.md     hand-authored; sync-sglang.mjs never writes here
        │  attachEngines() reads it (if present)
        ▼
recipe.engines.sglang.guide               string on the recipe — set on BOTH the live
        │                                  server read (lib/recipes.js) and the JSON API
        │                                  (build-recipes-api.mjs); both call attachEngines
        │  page.js passes guide strings + default_engine as serializable props
        ▼
<EngineAwareGuide>  (client)              reads ?engine= (same source as CommandBuilder),
                                           renders the right markdown, or the fallback notice
```

## Components

### 1. Join extension — `src/lib/engines/sglang-join.js`

`attachEngines(recipe)` already reads `engines/sglang/<hfId>.yaml` into `recipe.engines.sglang`. Extend it: after loading the block, if `engines/sglang-guides/<hfId>.md` exists, read it and set `block.guide = <file contents>` (trimmed of nothing — markdown rendered as-is). If absent, leave `block.guide` unset. A new module-level dir constant `SGLANG_GUIDES_DIR = path.join(process.cwd(), "engines", "sglang-guides")` mirrors the existing `SGLANG_DIR`.

This is the single attach point: it runs in `src/lib/recipes.js` (live server pages) and in `scripts/build-recipes-api.mjs` (JSON API), so both surfaces get the guide with one change. `scripts/sync-sglang.mjs` only writes `engines/sglang/`, never `engines/sglang-guides/`, so authored prose survives re-syncs.

### 2. Guide selection helper — `src/lib/guide.js` (new, pure)

```js
// Returns the markdown string to render for the active engine, or null when the
// engine has no guide (caller renders the fallback). vLLM uses the recipe's
// top-level guide; other engines use recipe.engines[engine].guide.
export function pickGuide(engine, recipe) {
  if (!engine || engine === "vllm") return recipe?.guide || null;
  return recipe?.engines?.[engine]?.guide || null;
}
```

Pure, no React, unit-tested in isolation.

### 3. Client component — `src/components/recipes/EngineAwareGuide.jsx` (new)

A thin `"use client"` component that replaces the inline guide rendering in `page.js`. Props: `{ recipe, defaultEngine }` (recipe already carries `guide` and `engines.sglang.guide`; both are serializable).

Behavior:
- `const engine = useSearchParams().get("engine") || defaultEngine || "vllm";` (mirrors `CommandBuilder`'s engine resolution exactly).
- `const md = pickGuide(engine, recipe);`
- If `md` → render it via `react-markdown` + `remark-gfm` + `rehype-slug` inside the existing `.guide-content` wrapper (moved verbatim from `page.js`).
- If `md` is null **and** `engine !== "vllm"` → render the fallback notice (a small styled `<p>`/callout): *"No SGLang-specific guide yet for this model — the command above is the authoritative setup. Switch the Engine pill to vLLM for that engine's full guide."* (engine name derived from `engine`, capitalized).
- If `md` is null and `engine === "vllm"` → render nothing (matches today's `{guide && …}` behavior when a recipe has no guide at all).

The `<Accordion title="Guide" defaultOpen>` wrapper stays in `page.js` around `<EngineAwareGuide>`, OR moves inside it — implementation detail for the plan; either keeps the accordion. Whichever is chosen, the accordion must still render when SGLang has a guide/fallback even if the vLLM `guide` is empty (rare).

### 4. page.js change

Replace the inline `<Markdown>…{guide}…</Markdown>` block with `<EngineAwareGuide recipe={recipe} defaultEngine={recipe.default_engine || "vllm"} />`. Remove the now-unused server-side `Markdown`/`remarkGfm`/`rehypeSlug` imports **only if** no other server-rendered markdown remains on the page (verify; the guide may be the sole user — if so move those deps into the client component).

### 5. Exemplar — `engines/sglang-guides/zai-org/GLM-5.1.md`

A real, verified SGLang guide authored to match the rendered SGLang command set:
- **Prerequisites:** SGLang ≥ 0.5.10 (the block's `min_version`); DeepGEMM for FP8; `--trust-remote-code`.
- **Install:** `python3 -m pip install "sglang[all]"` and/or the SGLang docker image.
- **Launch — single node** (`--tp 8` class hardware) and **multi-node** (head/worker with `--tp 32 --nnodes 4 --node-rank {0,1} --dist-init-addr $HEAD_IP:5000`), matching what the command builder renders.
- **Features:** `--tool-call-parser glm47`, `--reasoning-parser glm45`.
- **Verify:** a `curl /v1/chat/completions` example.
- **Links:** HF model card, SGLang docs.

This is also the authoring template for the remaining models.

## Testing

- **`sglang-join` test** (`src/lib/engines/sglang-join.test.mjs`): with a fixture `.md` present under a temp `engines/sglang-guides/<id>.md`, `attachEngines` sets `block.guide`; with none, `block.guide` is undefined and the rest of the block is unchanged. (Follow the existing test's fixture/mocking style; if the test can't easily write into the real tree, assert against an existing seeded guide instead.)
- **`pickGuide` unit tests** (`src/lib/guide.test.mjs`): `("vllm", recipe)` → `recipe.guide`; `("sglang", recipe)` with `engines.sglang.guide` → that string; `("sglang", recipe)` without → `null`; missing/empty engine → vLLM guide; no guide anywhere → `null`.
- **Golden:** `engines.sglang.guide` now appears in `zai-org/GLM-5.1.json`. This is an intended, real golden change — **rebaseline** `scripts/__tests__/api-golden.json` via `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs --write`, and review the diff (should be GLM-5.1 — and any promoted variant — gaining the guide field, nothing else).
- **Manual (dev server):** GLM-5.1 → toggle Engine: vLLM shows the existing guide, SGLang shows the authored guide; a guide-less SGLang model (e.g. `Qwen/Qwen3-235B-A22B-Instruct-2507`) → SGLang shows the fallback notice; a vLLM-only recipe (no `engines`) → unchanged.

## Decisions made (not asked)

- **Client-side rendering** (read `?engine=` reactively) over server `searchParams`, for an instant toggle matching the pill with no server round-trip.
- **`pickGuide` extracted as a pure helper** so the selection logic is unit-testable without a component-test harness (the repo has none).
