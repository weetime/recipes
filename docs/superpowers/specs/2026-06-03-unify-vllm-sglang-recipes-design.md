# 统一 vLLM Recipes 与 SGLang Cookbook 部署参数 — 设计文档

- 日期: 2026-06-03
- 状态: 已批准设计,待实现计划
- 目标: 在现有 vLLM recipes 站点(Next.js)上整合多套推理引擎的部署参数,首批为 vLLM + SGLang,并保证两个上游迭代时仍能低冲突地持续合并进本项目。

## 背景与约束

本仓库是 `vllm-project/recipes` 的 fork:一批结构化 YAML(`models/<org>/<repo>.yaml`)+ 一个 Next.js 15 站点,把 YAML 渲染成交互式 `vllm serve` 命令生成器。

SGLang 官方维护对应的 `sgl-project/sgl-cookbook`(Docusaurus 站点),数据模型不同:
- 配置按 **SGLang 版本** 分目录:`data/models/src/<version>/*.yaml`(手写)→ `data/models/generated/<version>/`(生成)。
- 并行参数内联:`tp / dp / ep / enable_dp_attention` + per-hardware overrides。
- 该 cookbook 正在并入主 `sglang` 仓库(README 标注已 "migrated to docs.sglang.io/cookbook/intro"),因此 SGLang 上游可能是移动目标。

两仓库数据模型对比:

| | vLLM recipes(本仓库) | sgl-cookbook |
|---|---|---|
| 布局 | `models/<org>/<repo>.yaml`(按模型) | `data/models/src/<version>/`(按引擎版本) |
| 引擎参数 | `strategies/*.yaml`(tp/tep/dep/pd) | 内联 `tp/dp/ep/enable_dp_attention` + per-hw override |
| 站点 | Next.js 15 | Docusaurus |
| 贡献流程 | `/add-recipe` skill | `/add-model` skill |

### 已确认的决策(brainstorming 输出)

1. **统一粒度 = 同页切换引擎**:一个模型一个页面,顶部一个引擎切换器(vLLM / SGLang)。同一模型若两引擎都有 recipe,在同一页对比 `vllm serve` 与 `sglang.launch_server`。
2. **上游同步 = 供货快照 + 转换脚本**:把上游作为 vendored 快照,用 transformer 把各自原生配置编译成统一内部 schema;上游变动重跑脚本,不手改生成内容。
3. **引擎范围 = vLLM + SGLang 两个,但架构留可插拔口子**:引擎做成 adapter 接口 + 注册表,未来加 TensorRT-LLM / LMDeploy 只需新增一个 adapter,不动核心。

### 选定方案:B —— 独立引擎数据层,构建时 join

(已对比 A=回写同一文件、C=归一化中间产物后选定 B。)

核心原则:**手写源原封不动,生成源全部隔离在可重生成的树里。**

- 让手写的 vLLM YAML 保持现状 ⇒ 从 `vllm-project/recipes` 上游 merge 永远无冲突面。
- SGLang 生成数据隔离在一棵可重生成的树里 ⇒ 契合"供货快照 + 转换脚本"。
- engine-adapter 模式干净插入 ⇒ 契合"留口子"。

## 数据架构

### 1. 仓库拓扑

```
recipes/
├── models/<org>/<repo>.yaml          # 不变。vLLM 手写源 = vLLM 引擎的输入
├── engines/
│   └── sglang/<org>/<repo>.yaml      # 新增。生成树,transformer 产出,不手改,头部带 GENERATED 标记
├── upstream/
│   ├── sglang/                       # 新增。vendored SGLang 快照(git subtree 或 fetch 脚本)
│   └── sglang.lock                   # 新增。记录 repo URL + commit SHA
├── strategies/*.yaml                 # 不变,vLLM 并行策略词表
├── taxonomy.yaml                     # 不变,作为两引擎共享的硬件/任务受控词表
├── src/lib/
│   ├── engines/                      # 新增。引擎适配器层
│   │   ├── index.js                  #   注册表
│   │   ├── types.js                  #   适配器契约
│   │   ├── vllm/synthesize.js        #   现有 vLLM 逻辑迁入
│   │   └── sglang/synthesize.js      #   新写
│   └── command-synthesis.js          # 改造成引擎分发 + 共享工具
└── scripts/
    ├── sync-sglang.mjs               # 新增。读 upstream/sglang/ → 生成 engines/sglang/
    └── build-recipes-api.mjs         # 改造,构建时 join 两引擎
```

`models/` 手写、`engines/sglang/` 生成,两者都进 git(便于 review diff),生成树头部带 `# GENERATED — do not edit`。

### 2. 统一 per-model JSON(UI 唯一消费物)

`build-recipes-api.mjs` 按 **`model.model_id`(HF repo)** 作 join key,合成 `public/<org>/<repo>.json`:

```jsonc
{
  "meta":  { "title": "...", "provider": "...", "tasks": [...] },   // 引擎无关,共享
  "model": { "model_id": "...", "parameter_count": "...", ... },    // 引擎无关
  "engines": {
    "vllm":   { "min_version": "0.11.1", "variants": {...}, "strategies": [...], "features": {...}, "base_args": [...] },
    "sglang": { "min_version": "0.5.8",  "variants": {...}, "strategies": [...], "features": {...}, "base_args": [...] }
  },
  "default_engine": "vllm"
}
```

引擎无关字段(参数量、上下文、任务、provider)放顶层共享;引擎相关字段(版本、变体、并行策略、特性、启动参数)放各自 `engines.<id>` 块。`default_engine` 固定为 vLLM(站点主体)。

### 3. Join 与降级规则

| 模型在哪 | 行为 |
|---|---|
| 两边都有 | `engines` 含两项,顶部显示引擎切换器,默认 vLLM |
| 仅 vLLM | `engines` 仅 vllm,无切换器(或 SGLang tab 灰显"暂无 SGLang recipe") |
| 仅 SGLang | 模型仍进站,`engines` 仅 sglang,默认 SGLang;顶层 `meta`/`model` 由 transformer 从 SGLang 配置合成最小元数据(provider 从 HF org 推,title 从 repo 名推) |

"仅 SGLang"那一行是有意保留的——否则会丢掉 SGLang 独有的模型目录,违背整合初衷。

### 4. 转换管线(`sync-sglang.mjs`)

```
upstream/sglang/data/models/src/<version>/*.yaml   (SGLang 原生,按引擎版本分目录)
        │  按 model_id 归并,取覆盖该模型的最新 SGLang version,记为 min_version
        ▼
engines/sglang/<org>/<repo>.yaml                    (我们的 SGLang 引擎块)
```

转换脚本三件职责:
1. **路径重映射**:SGLang "按版本"目录 → 我们的"按 HF org/repo"。
2. **字段归一化**:SGLang 的 `tp/dp/ep/enable_dp_attention` + per-hardware override → SGLang 引擎块的并行表示。**不**硬塞进 vLLM 的 `strategies/*.yaml`——两引擎并行词汇不同,SGLang 适配器用自己的策略词表。
3. **硬件映射**:SGLang 硬件标签 → `taxonomy.yaml` 硬件 id(hopper/blackwell/amd 等),让两引擎共用同一套硬件 pill。

**版本维度处理**:同一模型在多个 SGLang version 目录出现时,取最新版本作为该模型的 SGLang 引擎块,并记 `min_version`。(初版不把"版本"做成额外选择轴,保持简单;若后续需要,可作为变体轴扩展。)

## 运行时与运维

### 5. 引擎适配器接口(可插拔口子)

所有引擎差异收敛到一个接口,注册进 `src/lib/engines/index.js`。核心层只认接口,加引擎 = 加一个文件。

```js
// src/lib/engines/types.js  —— 适配器契约
interface EngineAdapter {
  id: 'vllm' | 'sglang',

  // 构建侧:读 vendored 上游快照 → 生成 engines/<id>/ 树。vLLM 适配器为 no-op(手写源就是它的输入)
  transform(upstreamDir): GeneratedFile[],

  // 渲染侧:从统一 recipe + 用户选择合成命令。返回单命令 / 头-worker 对 / prefill-decode 对
  synthesize(recipe, engineBlock, selections, taxonomy): Command | CommandPair,

  // 声明该引擎支持哪些选择轴,驱动 UI 显示哪些 pill 行
  capabilities(engineBlock): { variants, strategies, features, multiNode, pd },
}
```

- **vLLM 适配器** = 把现有 `command-synthesis.js` 包一层(`transform` 空操作,`synthesize` 复用现有纯函数)。零行为变化,先证明抽象成立。
- **SGLang 适配器** = 新写,`synthesize` 产出 `python -m sglang.launch_server ...`,带自己的并行词表(`--tp / --dp / --ep / --enable-dp-attention`)。

### 6. 命令合成改造

`command-synthesis.js` 现签名 `(recipe, variantKey, strategyName, hwId, features, strategies, taxonomy, advancedArgs, nodeCount)` 变成**引擎分发器**:多接一个 `engineId`,内部 `engines[engineId].synthesize(...)`。现有 vLLM 逻辑整体迁进 `src/lib/engines/vllm/synthesize.js`,主文件只剩 dispatch + 共享工具(advanced args 拼接、多节点 rank 展开这类可复用逻辑留共享层,引擎特有的下沉)。

### 7. UI:引擎切换器

`CommandBuilder.jsx` 顶部、Hardware 行之上,加一行 **Engine pill**(`vLLM | SGLang`),复用现有 pill-row + URL 同步模式(`?engine=sglang`)。

- 切引擎 → 用 `capabilities()` 重渲染下面的 Variant/Strategy/Nodes/Features 行(两引擎可选项不同)。
- 切引擎时尽量保留兼容选择(硬件、同名变体保留;策略/特性若新引擎不支持则回落到该引擎默认)。
- 降级:`engines` 只一个 → 不渲染该行;`default_engine` 决定首屏。
- Provider 侧边栏/卡片可加小双标(vLLM/SGLang 覆盖标记),让用户一眼看出哪些模型两引擎都有。

### 8. 同步工作流

两条上游,两套机制——因为本仓库本身就是 vLLM recipes 的 fork:

```bash
# vLLM 上游:普通 git merge,models/*.yaml 是它的源,无需转换
git fetch upstream-vllm && git merge upstream-vllm/main      # 零冲突面(我们没改这些文件)

# SGLang 上游:bump 快照 → 重跑 transformer → review diff → 提交
pnpm sync:sglang        # 1) 拉 upstream/sglang/ 到锁定 commit  2) 重生成 engines/sglang/  3) 打印变更摘要
git add engines/sglang upstream/sglang.lock && git commit
```

- `upstream/sglang/` 用 git subtree(或 fetch 脚本 + `upstream/sglang.lock` 记 commit SHA)。生成树进 git ⇒ 每次同步 diff 在 PR 里可视、可 review,不会悄悄漂。
- 可选 GitHub Action 定时跑 `pnpm sync:sglang`,有 diff 就自动开 PR(`chore: sync SGLang upstream @ <sha>`),把上游迭代变成常规 review-merge PR 流。
- `upstream/sglang.lock` 同时记 **repo URL + commit**;待 sgl-cookbook 完全并入主 sglang 仓库时,只改 lock 指向 + transformer 里的相对路径,不动其它。

## 分期落地

每期可独立合并、不破坏现状。

| 期 | 内容 | 产出 |
|---|---|---|
| **P1** | 搭 `src/lib/engines/` 适配器层,把现有 vLLM 逻辑包进 vLLM 适配器,command-synthesis 改 dispatch | 站点行为完全不变,抽象就位(单引擎验证留口子) |
| **P2** | vendor SGLang 快照 + 写 `sync-sglang.mjs` transformer | 生成 `engines/sglang/` 树,`build-recipes-api` 打印两引擎计数 |
| **P3** | build-join + 统一 per-model JSON + 降级规则 | `public/<org>/<repo>.json` 带 `engines` map |
| **P4** | UI 引擎切换器 + SGLang 命令渲染 + SGLang 适配器 `synthesize` | 用户可在页面切 vLLM/SGLang |
| **P5** | `pnpm sync:sglang` + CI 定时 drift PR | 上游迭代自动化进 review 流 |

P1 先落地以最低风险验证整个抽象;P2–P4 才真正引入 SGLang;P5 把持续同步固化。

## 验证方式

- 沿用现有约定:`node scripts/build-recipes-api.mjs` 是事实校验器,改造后应打印两引擎计数(如 `✓ JSON API: N models, M vLLM + K SGLang recipes`)。
- P1 验收:跑构建,输出与改造前**逐字节一致**(vLLM 适配器零行为变化)。
- 每期结束跑 `pnpm lint` + `node scripts/build-recipes-api.mjs`。

## 开放问题 / 后续

- SGLang 原生 schema 的逐字段映射表,留到实现计划阶段对照 `upstream/sglang/data/schema/` 细化。
- 是否把 SGLang 的"版本"维度暴露为 UI 选择轴(初版不做)。
- sgl-cookbook 并入主 sglang 仓库后的源切换时机(由 `upstream/sglang.lock` 兜底)。
