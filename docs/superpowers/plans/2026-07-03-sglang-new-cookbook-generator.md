# SGLang 新 cookbook config-driven 生成器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 SGLang block 生成器切换到只消费 upstream 新 cookbook 的声明式 config(`sgl-project/sglang` 的 `docs_new/src/snippets/configs/*.jsx`),退役旧管线与手写 block,仅以 overlay 保留 DeepSeek-V4-Flash 的 PPU 配置。

**Architecture:** 新 fetch 脚本 sparse-clone 新源 → vendored `.jsx` → 纯函数 `parseConfigModule` 求值 + `configToBlock` 映射到现有 block schema → `sync-sglang.mjs` 写 `engines/sglang/` → `attachEngines` 把 generated 块与 fork-local `engines/sglang-overlay/` 深合并。

**Tech Stack:** Node.js ESM 脚本、`node:test`/`node:assert`、`js-yaml`、`node:vm`/`Function` 求值 JSX config、Next.js(仅 InstallBlock 一处渲染改动)。

**设计依据:** `docs/superpowers/specs/2026-07-03-sglang-new-cookbook-generator-design.md`

## Global Constraints

- 提交一律 `git commit -s`(DCO sign-off);commit message 末尾加 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`。
- 目标仓库 `weetime/recipes`(fork 惯例,永不 vllm-project)。
- **另开分支** `feat/sglang-new-cookbook-generator`(独立 infra 重构,与 sync/upstream PR #31 分离)。
- block schema 保持不变,唯一新增字段:block 顶层 `nightly_required: true`(布尔)。
- 只取 single-node(`single_node_tp`);多机由 SGLang adapter 在渲染时按 `tp_by_hardware` vs `gpu_count` 推导。
- 只为**同时存在 vLLM recipe** 的模型生成 block。
- 测试文件命名 `*.test.mjs`,与被测源码同目录;`node --test` 自动发现。
- 验证口径:`node scripts/build-recipes-api.mjs` 打印 `✓ JSON API: N models` 即 YAML 集自洽;`node scripts/snapshot-api.mjs --write` 刷 golden;`node --test` 全绿。

---

## 文件结构

- **新增** `scripts/fetch-sglang-configs.mjs` — sparse-clone `sgl-project/sglang`,vendor `docs_new/src/snippets/configs/**/*.jsx`(跳过 `*-benchmarks.jsx`)到 `upstream/sglang-configs/`,写 `upstream/sglang-configs.lock`。
- **重写** `src/lib/engines/sglang-transform.js` — 删旧格式逻辑(`modelToBlock`/`transform`/`HW_NAME_MAP`/`compareVersions`),新增 `parseConfigModule(source)` + `configToBlock(config, hfId, recipePrecision, taxonomyHwIds)` + 内部 helper。
- **重写** `scripts/sync-sglang.mjs` — 读 vendored `.jsx`、解析、按 recipe overlap 生成块、wipe+rebuild `engines/sglang/`。
- **修改** `src/lib/engines/sglang-join.js` — `attachEngines` 改为 generated ∪ overlay 深合并;去掉 manual 回退。
- **新增** `engines/sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml` — 仅 PPU 增量。
- **修改** `src/components/recipes/CommandBuilder.jsx` — `InstallBlock` 支持 SGLang `nightly_required` 渲染。
- **修改** `package.json`(`sync:sglang`)、`.github/workflows/sync-sglang.yml`。
- **删除** `scripts/fetch-sglang-upstream.mjs`、`upstream/sglang/`、`upstream/sglang.lock`、`engines/sglang-manual/**`(PPU 转 overlay 后)、无主 guide。
- **重写测试** `src/lib/engines/sglang-transform.test.mjs`;**扩** `src/lib/engines/sglang-join.test.mjs`。

---

## Task 1: JSX config 求值器 `parseConfigModule`

**Files:**
- Modify: `src/lib/engines/sglang-transform.js`(先在顶部加此函数;旧内容 Task 2 处理)
- Test: `src/lib/engines/sglang-transform.test.mjs`(整文件重写,先放本任务用例)

**Interfaces:**
- Produces: `parseConfigModule(source: string) => object` — 输入一个 `.jsx` 配置模块的**文本**,返回其 `export const config = {…}` 求值后的对象。配置对象是纯数据(无内部 import 引用),含 `//` 行内注释与模板字符串。

- [ ] **Step 1: 写失败测试**

把 `src/lib/engines/sglang-transform.test.mjs` 整体替换为(本任务只放第一组;Task 2 追加):

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigModule } from "./sglang-transform.js";

test("parseConfigModule 求值纯数据 config,忽略注释与 import", () => {
  const src = `
// 顶部注释
import { Deployment } from "/src/snippets/_deployment.jsx";
export const config = {
  modelName: "X", // 行内注释
  supportedHardware: ["h200", "gb200"],
  cells: [{ match: { hw: "h200" }, flags: ["--tp 8"] }],
  curl: \`curl http://{{HOST}}\`,
};
`;
  const cfg = parseConfigModule(src);
  assert.equal(cfg.modelName, "X");
  assert.deepEqual(cfg.supportedHardware, ["h200", "gb200"]);
  assert.equal(cfg.cells[0].flags[0], "--tp 8");
  assert.match(cfg.curl, /\{\{HOST\}\}/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: FAIL — `parseConfigModule is not a function` / 模块导入报错。

- [ ] **Step 3: 实现**

把 `src/lib/engines/sglang-transform.js` 顶部现有 doc 注释保留,在文件**最前面**加:

```js
/**
 * 求值一个 SGLang 新 cookbook 的 config 模块文本 → 其 `config` 对象。
 * 这些模块是纯数据(对象内部不引用任何 import),但带行内注释和模板字符串,
 * 所以用一个受限的 Function 求值,而不是正则硬抠。
 */
export function parseConfigModule(source) {
  const noImports = String(source).replace(/^\s*import\s.*$/gm, "");
  // 把 `export const config =` 改成 `return`,并去掉任何其它顶层 export。
  const body = noImports
    .replace(/export\s+const\s+config\s*=/, "return ")
    .replace(/^\s*export\s+.*$/gm, "");
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict";\n${body}`);
  return fn();
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: PASS(1 test)。

- [ ] **Step 5: 提交**

```bash
git add src/lib/engines/sglang-transform.js src/lib/engines/sglang-transform.test.mjs
git commit -s -m "feat(sglang): add parseConfigModule for new-cookbook JSX configs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `configToBlock` 映射(替换旧 transform)

**Files:**
- Modify: `src/lib/engines/sglang-transform.js`(删除旧 `compareVersions`/`modelToBlock`/`transform`/`HW_NAME_MAP`,新增 `configToBlock` + helper)
- Test: `src/lib/engines/sglang-transform.test.mjs`(追加用例)

**Interfaces:**
- Consumes: `parseConfigModule`(Task 1)
- Produces:
  - `configToBlock(config: object, hfId: string, recipePrecision?: string, taxonomyHwIds?: Set<string>) => block` — 现有 block schema,含 `nightly_required: true`。
  - `hfIdForConfig(config: object) => string` — 从 `github.cookbookModel` 去掉量化后缀得到基准 recipe hf_id(如 `MiniMaxAI/MiniMax-M3-MXFP8` → `MiniMaxAI/MiniMax-M3`)。

**说明:** cell 的 `flags` 每个元素是**整条** `"--flag value"` 字符串(如 `"--tp 8"`、`"--reasoning-parser poolside_v1"`)。`model_id` 用实际服务 checkpoint(`modelNames["default|bf16"]` 优先,回退 `github.cookbookModel`);`hfId` 是匹配键(= recipe 路径)。parser 从 `playgroundFeatures.parsers.items[].flag` 取(声明式,最干净)。

- [ ] **Step 1: 写失败测试**

在 `sglang-transform.test.mjs` 追加:

```js
import { configToBlock, hfIdForConfig } from "./sglang-transform.js";

const CFG = {
  modelName: "Laguna-M.1",
  supportedHardware: ["h200", "gb200", "mi350x"], // mi350x 不在 taxonomy → 跳过
  quantizations: [{ id: "bf16" }, { id: "fp8" }],
  modelNames: { "default|bf16": "poolside/Laguna-M.1", "default|fp8": "poolside/Laguna-M.1-FP8" },
  github: { cookbookModel: "poolside/Laguna-M.1" },
  playgroundFeatures: { parsers: { items: [
    { id: "reasoning", flag: "--reasoning-parser poolside_v1" },
    { id: "toolCall", flag: "--tool-call-parser poolside_v1" },
  ] } },
  cells: [
    { match: { hw: "h200", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 8", "--host {{HOST_IP}}"] },
    { match: { hw: "gb200", quant: "bf16" }, flags: ["--model-path {{MODEL_NAME}}", "--trust-remote-code", "--reasoning-parser poolside_v1", "--tp 4", "--host {{HOST_IP}}"] },
  ],
};
const HW = new Set(["h200", "gb200", "b200"]);

test("configToBlock 映射 model_id/tp/base_args/features/nightly", () => {
  const b = configToBlock(CFG, "poolside/Laguna-M.1", "bf16", HW);
  assert.equal(b.engine, "sglang");
  assert.equal(b.model_id, "poolside/Laguna-M.1");
  assert.equal(b.nightly_required, true);
  assert.equal(b.serve_binary, "python3 -m sglang.launch_server");
  assert.deepEqual(b.base_args, ["--trust-remote-code"]);
  assert.deepEqual(b.tp_by_hardware, { h200: 8, gb200: 4 }); // mi350x 跳过
  assert.equal(b.variants.default.precision, "bf16");
  assert.deepEqual(b.strategies.single_node_tp, {});
  assert.equal(b.strategies.multi_node_tp, undefined);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "poolside_v1"]);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "poolside_v1"]);
});

test("configToBlock: 无 bf16 modelName 时 model_id 用量化 cookbookModel", () => {
  const cfg = { ...CFG, modelNames: {}, github: { cookbookModel: "MiniMaxAI/MiniMax-M3-MXFP8" } };
  const b = configToBlock(cfg, "MiniMaxAI/MiniMax-M3", "fp8", HW);
  assert.equal(b.model_id, "MiniMaxAI/MiniMax-M3-MXFP8");
});

test("configToBlock: parser=auto 原样保留", () => {
  const cfg = { ...CFG, playgroundFeatures: { parsers: { items: [
    { flag: "--reasoning-parser auto" }, { flag: "--tool-call-parser auto" },
  ] } } };
  const b = configToBlock(cfg, "x/y", "bf16", HW);
  assert.deepEqual(b.features.reasoning.args, ["--reasoning-parser", "auto"]);
  assert.deepEqual(b.features.tool_calling.args, ["--tool-call-parser", "auto"]);
});

test("hfIdForConfig 去掉量化后缀", () => {
  assert.equal(hfIdForConfig({ github: { cookbookModel: "MiniMaxAI/MiniMax-M3-MXFP8" } }), "MiniMaxAI/MiniMax-M3");
  assert.equal(hfIdForConfig({ github: { cookbookModel: "poolside/Laguna-M.1" } }), "poolside/Laguna-M.1");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: FAIL — `configToBlock is not a function`。

- [ ] **Step 3: 实现**

把 `sglang-transform.js` 里 `parseConfigModule` **之后**的旧内容(`HW_NAME_MAP`/`compareVersions`/`modelToBlock`/`transform`)**全部删掉**,替换为:

```js
// 已知量化后缀:从 cookbookModel 推基准 recipe hf_id 时剥离。
const QUANT_SUFFIXES = ["-FP8", "-NVFP4", "-MXFP8", "-MXFP4", "-INT8", "-INT4", "-AWQ", "-GPTQ"];

export function hfIdForConfig(config) {
  let id = config?.github?.cookbookModel || "";
  for (const suf of QUANT_SUFFIXES) {
    if (id.endsWith(suf)) { id = id.slice(0, -suf.length); break; }
  }
  return id;
}

// cell.flags 每个元素是整条 "--flag value" 字符串。
function tpFromCell(cell) {
  for (const f of cell?.flags || []) {
    const m = /^--tp\s+(\d+)/.exec(f);
    if (m) return Number(m[1]);
  }
  return null;
}

// 给某硬件挑一条代表 cell:优先 bf16 + single/首个 strategy,回退该 hw 的第一条。
function pickCell(config, hw) {
  const cells = (config.cells || []).filter((c) => c?.match?.hw === hw);
  return cells.find((c) => c.match?.quant === "bf16") || cells[0] || null;
}

// 所有 cell 共有、且非 model-path/host/port/tp/parser 的整条 flag → base_args。
function commonBaseArgs(config) {
  const cells = config.cells || [];
  if (!cells.length) return ["--trust-remote-code"];
  const EXCLUDE = /^--(model-path|host|port|tp|reasoning-parser|tool-call-parser)\b/;
  const sets = cells.map((c) => new Set((c.flags || []).filter((f) => !EXCLUDE.test(f))));
  const [first, ...rest] = sets;
  const common = [...first].filter((f) => rest.every((s) => s.has(f)));
  return common.length ? common : ["--trust-remote-code"];
}

export function configToBlock(config, hfId, recipePrecision, taxonomyHwIds) {
  const modelId = config.modelNames?.["default|bf16"] || config.github?.cookbookModel || hfId;

  const tp_by_hardware = {};
  for (const hw of config.supportedHardware || []) {
    if (taxonomyHwIds && !taxonomyHwIds.has(hw)) continue; // 未知硬件跳过
    const tp = tpFromCell(pickCell(config, hw));
    if (tp != null) tp_by_hardware[hw] = tp;
  }

  const features = {};
  for (const item of config.playgroundFeatures?.parsers?.items || []) {
    const parts = String(item.flag || "").trim().split(/\s+/);
    if (parts[0] === "--tool-call-parser") features.tool_calling = { args: parts };
    else if (parts[0] === "--reasoning-parser") features.reasoning = { args: parts };
  }

  const block = {
    engine: "sglang",
    model_id: modelId,
    nightly_required: true,
    serve_binary: "python3 -m sglang.launch_server",
    base_args: commonBaseArgs(config),
    tp_by_hardware,
    variants: { default: {} },
    strategies: { single_node_tp: {} },
    features,
  };

  const precision = recipePrecision || config.quantizations?.[0]?.id || null;
  if (precision) block.variants.default.precision = precision;
  return block;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test src/lib/engines/sglang-transform.test.mjs`
Expected: PASS(5 tests)。

- [ ] **Step 5: 提交**

```bash
git add src/lib/engines/sglang-transform.js src/lib/engines/sglang-transform.test.mjs
git commit -s -m "feat(sglang): configToBlock maps new-cookbook config to block schema

Replaces the old sgl-cookbook YAML transform. Maps model_id (served
checkpoint), per-hardware tp, common base_args, parser features, and marks
nightly_required. hfIdForConfig strips quant suffixes to match the vLLM recipe.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 新 fetch 脚本 `fetch-sglang-configs.mjs`

**Files:**
- Create: `scripts/fetch-sglang-configs.mjs`
- Modify: `package.json`(`sync:sglang`)

**Interfaces:**
- Produces: 运行后 `upstream/sglang-configs/docs_new/src/snippets/configs/**/*.jsx`(不含 `*-benchmarks.jsx`)+ `upstream/sglang-configs.lock`。

- [ ] **Step 1: 写脚本**

`scripts/fetch-sglang-configs.mjs`:

```js
/**
 * Vendor 新 SGLang cookbook 的结构化 config 到 upstream/sglang-configs/。
 * Sparse shallow-clone sgl-project/sglang,只取 docs_new/src/snippets/configs/,
 * 跳过 *-benchmarks.jsx,写 upstream/sglang-configs.lock 钉住 commit。
 * Usage: node scripts/fetch-sglang-configs.mjs [ref]
 */
import fs from "fs";
import path from "path";
import os from "os";
import { execFileSync } from "child_process";

const REPO = "sgl-project/sglang";
const SUBDIR = "docs_new/src/snippets/configs";
const ROOT = process.cwd();
const DEST = path.join(ROOT, "upstream", "sglang-configs");
const LOCK = path.join(ROOT, "upstream", "sglang-configs.lock");

function git(args, cwd) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
}

const lockRef = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, "utf8")).ref : null;
const ref = process.argv[2] || lockRef || "";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sglang-configs-"));
try {
  git(["clone", "--depth", "1", "--filter=blob:none", "--sparse",
       ...(ref ? ["--no-single-branch"] : []),
       `https://github.com/${REPO}.git`, tmp]);
  git(["sparse-checkout", "set", SUBDIR], tmp);
  if (ref) { git(["fetch", "--depth", "1", "origin", ref], tmp); git(["checkout", ref], tmp); }
  const sha = git(["rev-parse", "HEAD"], tmp);

  fs.rmSync(path.join(DEST, SUBDIR), { recursive: true, force: true });
  fs.mkdirSync(path.join(DEST, SUBDIR), { recursive: true });
  // 只拷 config .jsx,跳过 benchmarks。
  const srcDir = path.join(tmp, SUBDIR);
  for (const rel of fs.readdirSync(srcDir, { recursive: true })) {
    const relStr = String(rel);
    if (!relStr.endsWith(".jsx") || relStr.endsWith("-benchmarks.jsx")) continue;
    const from = path.join(srcDir, relStr);
    if (!fs.statSync(from).isFile()) continue;
    const to = path.join(DEST, SUBDIR, relStr);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }

  fs.writeFileSync(LOCK, JSON.stringify({ repo: REPO, ref: sha, subdir: SUBDIR, fetched_at: new Date().toISOString() }, null, 2) + "\n");
  const n = fs.readdirSync(path.join(DEST, SUBDIR), { recursive: true }).filter((f) => String(f).endsWith(".jsx")).length;
  console.log(`✓ vendored ${REPO}@${sha.slice(0, 12)} — ${n} config JSX → upstream/sglang-configs/${SUBDIR}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
```

- [ ] **Step 2: 改 package.json**

把 `"sync:sglang"` 那行改为:

```json
    "sync:sglang": "node scripts/fetch-sglang-configs.mjs && node scripts/sync-sglang.mjs",
```

- [ ] **Step 3: 跑 fetch 验证**

Run: `node scripts/fetch-sglang-configs.mjs`
Expected: 打印 `✓ vendored sgl-project/sglang@<sha> — 7 config JSX …`;`upstream/sglang-configs.lock` 生成;`upstream/sglang-configs/docs_new/src/snippets/configs/` 下有 7 个 `.jsx`(无 `-benchmarks`)。

- [ ] **Step 4: 提交**

```bash
git add scripts/fetch-sglang-configs.mjs package.json upstream/sglang-configs.lock upstream/sglang-configs
git commit -s -m "feat(sglang): fetch new-cookbook configs from sgl-project/sglang docs_new

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 重写 `sync-sglang.mjs`(消费 vendored config)

**Files:**
- Rewrite: `scripts/sync-sglang.mjs`
- 依赖 Task 1/2/3 产物。

**Interfaces:**
- Consumes: `parseConfigModule`、`configToBlock`、`hfIdForConfig`;`upstream/sglang-configs/`;`models/`;`taxonomy.yaml`。
- Produces: wipe+rebuild `engines/sglang/<org>/<repo>.yaml`(每个匹配到 recipe 的 config 一个块)。

- [ ] **Step 1: 重写脚本**

`scripts/sync-sglang.mjs` 整体替换为:

```js
/**
 * 从 upstream/sglang-configs/(新 cookbook 的声明式 config)生成
 * engines/sglang/<org>/<repo>.yaml,仅对同时存在 vLLM recipe 的模型。
 * Run after scripts/fetch-sglang-configs.mjs。每次 wipe+rebuild engines/sglang。
 */
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { parseConfigModule, configToBlock, hfIdForConfig } from "../src/lib/engines/sglang-transform.js";

const ROOT = process.cwd();
const CONFIGS_DIR = path.join(ROOT, "upstream", "sglang-configs", "docs_new", "src", "snippets", "configs");
const MODELS_DIR = path.join(ROOT, "models");
const OUT_DIR = path.join(ROOT, "engines", "sglang");
const TAXONOMY = path.join(ROOT, "taxonomy.yaml");

// recipe hf_id 集 + 每个 checkpoint 的权威精度(recipe 覆盖 upstream)。
function scanRecipes() {
  const ids = new Set();
  const precisionByHfId = new Map();
  for (const org of fs.readdirSync(MODELS_DIR)) {
    const orgDir = path.join(MODELS_DIR, org);
    if (!fs.statSync(orgDir).isDirectory()) continue;
    for (const f of fs.readdirSync(orgDir)) {
      if (!/\.ya?ml$/.test(f)) continue;
      const hfId = `${org}/${f.replace(/\.ya?ml$/, "")}`;
      ids.add(hfId);
      try {
        const rec = yaml.load(fs.readFileSync(path.join(orgDir, f), "utf8"));
        const p = rec?.variants?.default?.precision;
        if (p) precisionByHfId.set(hfId, p);
      } catch { /* 忽略解析失败,build 脚本会另行报错 */ }
    }
  }
  return { ids, precisionByHfId };
}

function taxonomyHwIds() {
  const taxo = yaml.load(fs.readFileSync(TAXONOMY, "utf8"));
  return new Set(Object.keys(taxo?.hardware_profiles || {}));
}

function listConfigFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    const relStr = String(rel);
    if (relStr.endsWith(".jsx") && !relStr.endsWith("-benchmarks.jsx")) out.push(path.join(dir, relStr));
  }
  return out;
}

const { ids: recipeIds, precisionByHfId } = scanRecipes();
const hwIds = taxonomyHwIds();

// wipe+rebuild
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const written = [];
const skipped = [];
for (const file of listConfigFiles(CONFIGS_DIR)) {
  let config;
  try { config = parseConfigModule(fs.readFileSync(file, "utf8")); }
  catch (e) { skipped.push(`${file} (parse error: ${e.message})`); continue; }

  const hfId = hfIdForConfig(config);
  if (!hfId || !recipeIds.has(hfId)) { skipped.push(`${config.modelName || file} → ${hfId || "?"} (no vLLM recipe)`); continue; }

  const block = configToBlock(config, hfId, precisionByHfId.get(hfId), hwIds);
  const outPath = path.join(OUT_DIR, `${hfId}.yaml`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `# GENERATED by scripts/sync-sglang.mjs from the new SGLang cookbook — do not edit\n` + yaml.dump(block, { lineWidth: -1 }));
  written.push(hfId);
}

written.sort();
skipped.sort();
console.log(`✓ SGLang blocks: ${written.length} generated`);
for (const w of written) console.log(`   ${w}`);
if (skipped.length) { console.log(`  skipped ${skipped.length}:`); for (const s of skipped) console.log(`   - ${s}`); }
```

- [ ] **Step 2: 跑生成验证**

Run: `node scripts/sync-sglang.mjs`
Expected: 打印 `✓ SGLang blocks: N generated`,其中含 `deepseek-ai/DeepSeek-V4-Flash`、`deepseek-ai/DeepSeek-V4-Pro`、`zai-org/GLM-5.2`、`MiniMaxAI/MiniMax-M3`、`poolside/Laguna-M.1`、`poolside/Laguna-XS-2.1`,以及 lfm2.5 匹配到的那个 LiquidAI recipe。skipped 列出无 recipe 的。**验证** `engines/sglang/` 下这些文件已生成且 `nightly_required: true`、`tp_by_hardware` 正确。

- [ ] **Step 3: 抽查一个生成块**

Run: `cat engines/sglang/poolside/Laguna-M.1.yaml`
Expected: `model_id: poolside/Laguna-M.1`、`tp_by_hardware: {h200: 8, b200: 8, b300: 8, gb200: 4, gb300: 4}`、`features.reasoning`/`tool_calling` = `poolside_v1`、`nightly_required: true`。

- [ ] **Step 4: 提交**

```bash
git add scripts/sync-sglang.mjs engines/sglang
git commit -s -m "feat(sglang): rewrite sync-sglang to consume new-cookbook configs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: overlay 深合并 + PPU overlay + 删 manual 树

**Files:**
- Modify: `src/lib/engines/sglang-join.js`
- Create: `engines/sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml`
- Delete: `engines/sglang-manual/**`
- Test: `src/lib/engines/sglang-join.test.mjs`(改/加用例)

**Interfaces:**
- Produces: `attachEngines(recipe, dirs?)` — 用 `engines/sglang/`(generated)与 `engines/sglang-overlay/`(fork-local)深合并;不再回退 `engines/sglang-manual/`。`dirs` 支持 `{sglangDir, sglangOverlayDir, sglangGuidesDir}`。

- [ ] **Step 1: 写失败测试**

替换 `sglang-join.test.mjs` 里 `tmpDirs` 与 manual 相关用例。`tmpDirs` 改为建 `sglang / sglang-overlay / sglang-guides`,并把 `attachEngines` 调用传 `{sglangDir, sglangOverlayDir, sglangGuidesDir}`。追加深合并用例:

```js
test("attachEngines 深合并 generated + overlay(PPU)", () => {
  const dirs = tmpDirs({
    "sglang/deepseek-ai/DeepSeek-V4-Flash.yaml":
      "engine: sglang\nmodel_id: deepseek-ai/DeepSeek-V4-Flash\ntp_by_hardware:\n  h200: 4\n  b200: 4\nfeatures: {}\n",
    "sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml":
      "tp_by_hardware:\n  thead_ppu_810e: 8\nhardware_overrides:\n  thead_ppu_810e:\n    extra_args: ['--quantization', 'w8a8_int8']\n",
  });
  const recipe = { hf_id: "deepseek-ai/DeepSeek-V4-Flash", model: { min_vllm_version: "0.5.0" } };
  const out = attachEngines(recipe, dirs);
  const b = out.engines.sglang;
  assert.deepEqual(b.tp_by_hardware, { h200: 4, b200: 4, thead_ppu_810e: 8 });
  assert.deepEqual(b.hardware_overrides.thead_ppu_810e.extra_args, ["--quantization", "w8a8_int8"]);
});

test("attachEngines: 无 generated 无 overlay 则 no-op", () => {
  const dirs = tmpDirs({});
  const out = attachEngines({ hf_id: "x/y", model: {} }, dirs);
  assert.equal(out.engines, undefined);
});
```

(删除原 "reads an authored manual block"/manual-fallback 用例;`no sglang block` 用例保留但用空 dirs。)

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: FAIL — overlay 未合并 / `sglangOverlayDir` 未识别。

- [ ] **Step 3: 实现**

`sglang-join.js` 顶部常量加 overlay,删 manual:

```js
const SGLANG_DIR = path.join(process.cwd(), "engines", "sglang");
const SGLANG_OVERLAY_DIR = path.join(process.cwd(), "engines", "sglang-overlay");
const SGLANG_GUIDES_DIR = path.join(process.cwd(), "engines", "sglang-guides");

// overlay 深合并:对象递归合并,标量/数组以 overlay 为准。
function deepMerge(base, over) {
  if (Array.isArray(over) || typeof over !== "object" || over === null) return over;
  const out = { ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}) };
  for (const [k, v] of Object.entries(over)) out[k] = deepMerge(out[k], v);
  return out;
}
```

`attachEngines` 主体改为:

```js
export function attachEngines(recipe, dirs = {}) {
  const sglangDir = dirs.sglangDir || SGLANG_DIR;
  const sglangOverlayDir = dirs.sglangOverlayDir || SGLANG_OVERLAY_DIR;
  const sglangGuidesDir = dirs.sglangGuidesDir || SGLANG_GUIDES_DIR;

  const hfId = recipe?.hf_id;
  if (!hfId) return recipe;

  const genPath = path.join(sglangDir, `${hfId}.yaml`);
  const ovPath = path.join(sglangOverlayDir, `${hfId}.yaml`);
  const gen = fs.existsSync(genPath) ? yaml.load(fs.readFileSync(genPath, "utf8")) : null;
  const ov = fs.existsSync(ovPath) ? yaml.load(fs.readFileSync(ovPath, "utf8")) : null;
  if (!gen && !ov) return recipe;
  let block = gen && ov ? deepMerge(gen, ov) : (gen || ov);

  const guidePath = path.join(sglangGuidesDir, `${hfId}.md`);
  if (fs.existsSync(guidePath) && block && typeof block === "object") {
    block.guide = fs.readFileSync(guidePath, "utf8");
  }
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
  recipe.default_engine = "vllm";
  return recipe;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test src/lib/engines/sglang-join.test.mjs`
Expected: PASS。

- [ ] **Step 5: 建 PPU overlay + 删 manual 树**

从现有 `engines/sglang-manual/deepseek-ai/DeepSeek-V4-Flash.yaml` 抽出 PPU 增量,写 `engines/sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml`(**只保留** PPU 的 tp + hardware_overrides,generated 块已提供其余):

```yaml
# FORK-LOCAL overlay(engines/sglang-overlay/)——合并进 DeepSeek-V4-Flash 的
# generated SGLang 块。仅含我们自测的 PPU-ZW810E(T-Head 真武, INT8)配置;
# upstream cookbook 永不会有。完整 PPU 启动命令见 SGLang guide 的 PPU 段。
tp_by_hardware:
  thead_ppu_810e: 8
hardware_overrides:
  thead_ppu_810e:
    extra_args:
      - '--enable-metrics'
      - '--context-length'
      - '8192'
      - '--quantization'
      - 'w8a8_int8'
      - '--attention-context-parallel-size'
      - '8'
      - '--enable-nsa-prefill-context-parallel'
      - '--moe-a2a-backend'
      - 'deepep'
      - '--disable-shared-experts-fusion'
      - '--max-running-requests'
      - '32'
      - '--cuda-graph-bs'
      - '32'
      - '--mem-fraction-static'
      - '0.75'
      - '--chunked-prefill-size'
      - '8192'
      - '--kv-cache-dtype'
      - 'bfloat16'
      - '--disable-piecewise-cuda-graph'
      - '--speculative-algo'
      - 'EAGLE'
      - '--speculative-num-steps'
      - '2'
      - '--speculative-eagle-topk'
      - '1'
      - '--speculative-num-draft-tokens'
      - '2'
    extra_env:
      GPU_COUNT: '8'
      NODE_COUNT: '1'
      PORT: '8000'
      SGLANG_OPT_USE_MULTI_STREAM_OVERLAP: '1'
      SGLANG_DEEPEP_NUM_MAX_DISPATCH_TOKENS_PER_RANK: '512'
      SGLANG_OPT_USE_COMPRESSOR_V2: '0'
      SGLANG_OPT_FUSE_WQA_WKV: '0'
      SGLANG_DSV4_FP4_EXPERTS: '0'
      SGLANG_OPT_USE_FUSED_STORE_CACHE: '0'
```

然后删 manual 树,并处理 guide 孤儿:

```bash
git rm -r engines/sglang-manual
# 保留 DeepSeek-V4-Flash guide(含 PPU 段);删掉模型已不在新 7 个覆盖内的 guide。
# 用下面命令列出孤儿 guide(有 .md 但 engines/sglang/ 无同名块),人工核对后删:
for g in $(cd engines/sglang-guides && find . -name '*.md'); do
  hf="${g#./}"; hf="${hf%.md}"
  [ -f "engines/sglang/$hf.yaml" ] || echo "orphan guide: $hf"
done
```

对上面列出的 orphan guide 执行 `git rm engines/sglang-guides/<hf>.md`(DeepSeek-V4-Flash 会显示为 orphan——但它有 overlay 且会渲染,**保留**它;其余 orphan 删除)。

- [ ] **Step 6: 更新 README + 提交**

改 `engines/sglang-manual/README.md`?—— 该目录已删。若存在 `engines/sglang-overlay/README.md` 需求,新建一份简述 overlay 用途(可选)。提交:

```bash
git add -A engines/ src/lib/engines/sglang-join.js src/lib/engines/sglang-join.test.mjs
git commit -s -m "feat(sglang): overlay deep-merge; PPU as fork-local overlay; drop manual tree

attachEngines now merges generated blocks with engines/sglang-overlay/ instead
of falling back to hand-authored manual blocks. The DeepSeek-V4-Flash PPU-ZW810E
config survives as an overlay; the ~77 manual blocks are retired.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: SGLang `nightly_required` 安装渲染

**Files:**
- Modify: `src/components/recipes/CommandBuilder.jsx`(`InstallBlock`,约 2286 与 2291-2292 行)

**Interfaces:**
- Consumes: `engineBlock`(= `recipe.engines.sglang`)的 `nightly_required`。
- 效果:SGLang 引擎且块 `nightly_required` 时,pip 默认命令改为 from-source(nightly),而非 `pip install "sglang[all]>=x"`。

- [ ] **Step 1: 改 nightlyRequired(约 2286 行)**

现有:

```jsx
  const nightlyRequired = isVllm && (recipe.model?.nightly_required === true || variant?.nightly_required === true);
```

改为(让 SGLang 也能触发):

```jsx
  const nightlyRequired = isVllm
    ? (recipe.model?.nightly_required === true || variant?.nightly_required === true)
    : (engineBlock?.nightly_required === true);
```

- [ ] **Step 2: 改非-vLLM 默认 pip 命令(约 2291-2292 行)**

现有:

```jsx
  const defaultPipCmd = !isVllm
    ? `python3 -m pip install "sglang[all]${minV ? `>=${minV}` : ""}"`
    : isAmd
```

把 `!isVllm` 分支拆成 nightly / 稳定两种:

```jsx
  const defaultPipCmd = !isVllm
    ? (nightlyRequired
        ? `# SGLang support for this model is on main (not yet in a tagged release)
git clone https://github.com/sgl-project/sglang.git
cd sglang && uv pip install -e python`
        : `python3 -m pip install "sglang[all]${minV ? `>=${minV}` : ""}"`)
    : isAmd
```

- [ ] **Step 3: 构建验证**

Run: `node scripts/build-recipes-api.mjs`
Expected: `✓ JSON API: …`(无报错)。dev server(若在跑)HMR 后,打开一个 SGLang nightly 模型(如 Laguna-M.1),切到 SGLang 引擎,Install 区块显示 `git clone … uv pip install -e python`,而非 `sglang[all]>=`。

- [ ] **Step 4: 提交**

```bash
git add src/components/recipes/CommandBuilder.jsx
git commit -s -m "feat(sglang): render from-source install for nightly_required SGLang blocks

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 退役旧管线 + 全量再生成 + 校验

**Files:**
- Delete: `scripts/fetch-sglang-upstream.mjs`、`upstream/sglang/`、`upstream/sglang.lock`
- Modify: `.github/workflows/sync-sglang.yml`
- Regenerate: `engines/sglang/`、`scripts/__tests__/api-golden.json`

- [ ] **Step 1: 删旧 fetch/快照/lock**

```bash
git rm scripts/fetch-sglang-upstream.mjs upstream/sglang.lock
git rm -r upstream/sglang
```

- [ ] **Step 2: 更新 workflow**

编辑 `.github/workflows/sync-sglang.yml`,把跑旧 fetch 的步骤改为 `node scripts/fetch-sglang-configs.mjs && node scripts/sync-sglang.mjs`(或直接 `pnpm sync:sglang`),并把注释里 `sgl-cookbook` / `data/models/generated` 的描述更新为新源 `sgl-project/sglang docs_new/src/snippets/configs`。

- [ ] **Step 3: 全量再跑 sync + 校验**

```bash
pnpm sync:sglang
node scripts/build-recipes-api.mjs
node scripts/snapshot-api.mjs --write
node --test
```

Expected:
- `sync:sglang` 打印 `✓ SGLang blocks: N generated`(N≈7)。
- `build-recipes-api` 打印 `✓ JSON API: 144 models …`(模型数不变;SGLang 覆盖数下降符合设计)。
- `node --test` **全绿**(旧格式 transform 测试已随 Task 2 改写;overlay/新 transform 测试通过)。
- golden 有大 diff(旧 generated + manual block 消失、7 个新块加入)——预期。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -s -m "chore(sglang): retire deprecated sgl-cookbook pipeline; rebaseline golden

Removes fetch-sglang-upstream.mjs + the frozen upstream/sglang snapshot, points
the sync workflow at the new sgl-project/sglang docs_new config source, and
rebaselines the API golden after regeneration.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: 开 PR**

```bash
git push -u origin feat/sglang-new-cookbook-generator
gh pr create --repo weetime/recipes --base main --head feat/sglang-new-cookbook-generator \
  --title "SGLang: switch generator to new cookbook config source" \
  --body "见 docs/superpowers/specs/2026-07-03-sglang-new-cookbook-generator-design.md。只吃 sgl-project/sglang docs_new/src/snippets/configs 的声明式 config;退役旧 sgl-cookbook 管线与 ~77 手写 block;DeepSeek-V4-Flash PPU 转 overlay 保留。SGLang 覆盖从 ~106 降到 7,随 upstream 迁移自愈。node --test 全绿,golden 已重刷。"
```

---

## Self-Review 记录

**Spec 覆盖核对:**
- §4.1 新 fetch → Task 3 ✓
- §4.2 退役旧管线 → Task 7(删除)+ Task 5(删 manual、PPU overlay)✓
- §4.3 configToBlock 映射 + overlap + LiquidAI 家族(`hfIdForConfig` 匹配单一 recipe)→ Task 2 + Task 4 ✓
- §4.4 PPU overlay 深合并 + fallback → Task 5(deepMerge + `gen||ov` 兜底)✓
- §4.5 nightly/min_version → Task 2(`nightly_required`)+ Task 6(渲染)✓
- §6 测试 → Task 1/2/5 单测 + Task 7 golden/`node --test` ✓

**占位符扫描:** 无 TBD/TODO;所有代码步骤含完整代码。Task 4 Step 2 对 lfm2.5 匹配到的 LiquidAI recipe 名以运行输出为准(验证步骤,非逻辑占位)。

**类型一致性:** `parseConfigModule`/`configToBlock`/`hfIdForConfig` 在 Task 1/2 定义,Task 4 消费一致;`deepMerge`/`attachEngines(dirs.sglangOverlayDir)` Task 5 内自洽;`nightly_required` 布尔在 Task 2 产出、Task 6 消费。
