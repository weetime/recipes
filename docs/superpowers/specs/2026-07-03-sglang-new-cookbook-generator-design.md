# SGLang blocks: 切换到新 cookbook 的 config-driven 生成器

**日期**: 2026-07-03
**分支**: `sync/upstream`(承接本次 upstream 同步的收尾)
**状态**: 设计待用户复审

## 1. 背景与问题

SGLang cookbook 已从独立仓库 `sgl-project/sgl-cookbook` **迁移进主仓库** `sgl-project/sglang` 的 `docs_new/`(渲染为 `docs.sglang.io/cookbook/intro`,由 PR #254 完成)。

我们当前的生成管线仍指向旧仓库,已经过时:

- `scripts/fetch-sglang-upstream.mjs` 拉 `sgl-project/sgl-cookbook` 的 `data/models/generated/*.yaml`,lock 钉在 `7b5bd9c`(**2026-05-02**,该仓库最后一次提交)。
- 旧仓库 README 现在只写着一句 "SGLang Cookbook now migrated to https://docs.sglang.io/cookbook/intro"。仓库已冻结。

新 cookbook 里有**两种**结构化格式:

1. **新 shared-config 格式** — `docs_new/src/snippets/configs/<org>/<model>.jsx`,导出一个干净的声明式 `config` 对象,被共享的 `<Deployment config={config}/>` 引擎消费。**目前 7 个模型**:`poolside/laguna-m1`、`poolside/laguna-xs21`、`MiniMaxAI/minimax-m3`、`zai-org/glm-5.2`、`LiquidAI/lfm2.5`、`baidu/unlimited-ocr`、`deepseek-ai/deepseek-v4`。
2. **老 per-model 组件格式** — `docs_new/src/snippets/autoregressive/<model>-deployment.jsx`,是 React 组件(数据与视图混写,启动 flags/parser 名在 render 逻辑里命令式拼出)。**66 个模型**。这是 upstream 正在**淘汰**的格式。

我们本地还有历史包袱:`engines/sglang-manual/` 下约 77 个手写 block(issue #13 的 "web-verified 猜测"),以及 `engines/sglang/` 下约 29 个从**已冻结旧快照**生成的 block。

## 2. 目标与原则

用户指示:**不背历史债务,数据怎么最可信怎么来,彻底摈弃旧的。** 唯一必须保留的本地贡献是我们自己测的 **DeepSeek-V4-Flash on PPU-ZW810E(T-Head 真武,INT8)** 配置。

据此确定原则:

- **单一可信来源**:SGLang block 只来自 upstream 新 cookbook 的**声明式** config,每个 block 可追溯到官方签过字的 deploy matrix。
- **零维护债**:不给正在被淘汰的老组件格式写解析器(建在沙子上);不再维护手写猜测 block。
- **自愈**:upstream 每把一个模型迁到新 config 格式,我们下次 sync 自动接住。

## 3. 核心决策

**只消费新 shared-config 格式(`src/snippets/configs/*.jsx`)。彻底退役旧管线与手写 block(PPU 除外)。**

- **不**解析老 per-model 组件格式(66 个)—— 它是 upstream 淘汰中的格式,且数据/视图混写、parser 名藏在 render 逻辑里,无法确定性解析。
- **保留** DeepSeek-V4-Flash 的 PPU 部分,做成 fork-local **overlay**,合并进它的 generated block。

### 3.1 覆盖面后果(用户已知情并选择「彻底切换」)

SGLang engine pill 从当前约 106 个模型**降到 7 个**,之后随 upstream 迁移自动增长。这是刻意的取舍:**少而全可信、零维护** 优于 **多而陈旧/猜测**。

## 4. 架构

```
sgl-project/sglang  docs_new/src/snippets/configs/**/*.jsx
        │  scripts/fetch-sglang-configs.mjs (sparse clone → vendor)
        ▼
upstream/sglang-configs/**            upstream/sglang-configs.lock
        │  scripts/sync-sglang.mjs (重写: 解析 JSX config → block)
        │  src/lib/engines/sglang-transform.js (重写: configToBlock)
        ▼
engines/sglang/<org>/<repo>.yaml (generated, 每次 wipe+rebuild)
        +  engines/sglang-overlay/<org>/<repo>.yaml (fork-local, 深合并)
        ▼  src/lib/engines/sglang-join.js (attachEngines: generated ∪ overlay)
recipe.engines.sglang
```

### 4.1 新增 fetch：`scripts/fetch-sglang-configs.mjs`

- Sparse shallow-clone `sgl-project/sglang`,只 checkout `docs_new/src/snippets/configs`。
- 把 `**/*.jsx`(**跳过 `*-benchmarks.jsx`**)vendor 到 `upstream/sglang-configs/`。
- 写 `upstream/sglang-configs.lock`(repo/ref/subdir/fetched_at),沿用现有 lock 风格。
- 默认 ref = lock 里的 ref(可复现);传参可 bump 到最新。

### 4.2 退役旧管线

**删除**:

- `scripts/fetch-sglang-upstream.mjs`
- `upstream/sglang/`(旧快照)、`upstream/sglang.lock`
- `src/lib/engines/sglang-transform.js` 里的旧格式分支(`modelToBlock` 老逻辑、`transform({versionDocs,...})`、`HW_NAME_MAP` 中不再需要的项按需保留)
- `engines/sglang-manual/` 整棵树(约 77 个),**唯独把 DeepSeek-V4-Flash 的 PPU 部分转成 overlay**(见 4.4)。
- `engines/sglang-guides/` 中已无对应 block 的孤儿 guide(DeepSeek-V4-Flash 的 guide **保留**,含 PPU 段;其余 guide 若其模型不在新 7 个里则删除,避免孤儿)。

`package.json` 的 `sync:sglang` 改为 `node scripts/fetch-sglang-configs.mjs && node scripts/sync-sglang.mjs`。删除 `.github/workflows/sync-sglang.yml` 里对旧 fetch 的引用(改指新脚本)。

### 4.3 重写 transform：`configToBlock(config, hfId, recipePrecision)`

纯函数,无 IO。输入一个已求值的 `config` 对象 + 目标 `hfId`(= 我们 recipe 的 `org/repo`)+ recipe 精度。输出**现有** block schema:

```yaml
engine: sglang
model_id: <served checkpoint>
min_version: <见 4.5>
nightly_required: true            # 见 4.5
serve_binary: python3 -m sglang.launch_server
base_args: ['--trust-remote-code', ...]   # 所有 cell 共有、且非 tp/parser 的 flag
tp_by_hardware: { h200: 8, gb200: 4, ... }
variants: { default: { precision: <recipe> } }
strategies: { single_node_tp: {} }
features:
  tool_calling: { args: ['--tool-call-parser', '<name>'] }
  reasoning:    { args: ['--reasoning-parser', '<name>'] }
```

**字段映射规则**：

| block 字段 | 来源 | 备注 |
|---|---|---|
| `model_id` | `config.modelNames["default\|bf16"]` 优先,回退 `github.cookbookModel` | ⚠ 可能是量化 checkpoint(如 `MiniMax-M3-MXFP8`);block 的**文件路径/匹配键**仍用 recipe 的 `hfId`,`model_id` 用实际服务 checkpoint |
| `tp_by_hardware` | 每个 `supportedHardware` 取其 bf16(或首个可用 quant)、首个 strategy、single-node 的 cell,从 `flags[]` 里解析 `--tp N` | hw id 已是我们 taxonomy 的小写 id(h200/b200/gb200/…),无需 `HW_NAME_MAP` |
| `base_args` | 对所有 cell 的 `flags[]` 求交集,去掉 `--model-path`、`--host`、`--port`、`--tp *` 和 parser flag(占位符 `{{...}}` 一律剔除) | 通常只剩 `--trust-remote-code` |
| `features.{tool_calling,reasoning}` | `config.playgroundFeatures.parsers.items[].flag`(拆成 `['--tool-call-parser', name]`) | parser 名可能是 `auto`(minimax-m3),原样保留 |
| `variants.default.precision` | recipe 精度(权威),回退 config 的默认 quant | 与旧 transform 一致 |

**只取 single-node（single_node_tp）**,与旧 transform 同口径;多机由 SGLang adapter 在渲染时按 `tp_by_hardware` vs `gpu_count` 推导。

**硬件过滤**:`supportedHardware` 里不在我们 `taxonomy.yaml` 的硬件 id 跳过(并 log 警告)。

**overlap 约束**:只为**同时存在 vLLM recipe** 的模型生成 block(与旧管线一致)。LiquidAI/lfm2.5 一个 config 对应一家族——**只给 `config.modelNames` 真正点名的 checkpoint 匹配到的那个 recipe 生成**,其余家族成员不给 SGLang block(除非 config 枚举了)。

### 4.4 PPU overlay 机制

DeepSeek-V4-Flash 会有 generated block(来自新 config,NVIDIA 硬件)。PPU 数据是 fork-local、upstream 永不会有。当前它在 manual block 里,但 "generated-wins" 会让 manual 被**完全忽略** → PPU 丢失。

方案:新增 fork-local overlay 树 `engines/sglang-overlay/`,只放 fork 增量。`DeepSeek-V4-Flash.yaml` 只含:

```yaml
tp_by_hardware:
  thead_ppu_810e: 8
hardware_overrides:
  thead_ppu_810e:
    extra_args: [ ... ]   # 现有 PPU INT8 参数,原样搬来
    extra_env:   { ... }
```

`attachEngines`(`sglang-join.js`)改为:先读 generated block,若存在 `engines/sglang-overlay/<hf_id>.yaml` 则**深合并**(overlay 覆盖/补充 `tp_by_hardware` 与 `hardware_overrides` 等键)。`sync-sglang.mjs` **绝不**写/清 overlay 树。DeepSeek-V4-Flash 的 SGLang guide(含 PPU 段)保留在 `engines/sglang-guides/`,attachEngines 照旧合并。

> 若 DeepSeek-V4-Flash 因某种原因**没**进新 config 的 overlap(例如 recipe id 与 `cookbookModel` 对不上),则 PPU 仍需一条能独立成 block 的退路——此时 overlay 退化为完整 manual block。实现时以「generated 是否真的产出 DeepSeek-V4-Flash」为准做二选一。

### 4.5 nightly / min_version

这 7 个都需 SGLang `main`(config 无正式 tag,`sglang_version: "main @ <sha>"`,`dockerImages` 是 nightly tag)。

- block 打 `nightly_required: true`。
- SGLang 的 Install 渲染(`CommandBuilder` 的 `InstallBlock`,非 vLLM 分支)在 `nightly_required` 时,把默认 `pip install "sglang[all]>=x"` 换成 **from-source / nightly**(对应 MDX Install accordion:`git clone … && uv pip install -e python`,或 `docker pull <config.dockerImages 里的 tag>`)。
- `min_version` 填最接近的下界或留空;不作为 `>=` 版本约束展示。
- 这是**唯一**沾 schema 的新增(一个布尔位),与 vLLM 变体已有的 `nightly_required` 语义对齐,风险可控。

## 5. 会删除 / 会保留

**删除**:旧 fetch 脚本、旧快照 + lock、旧 transform 分支、约 77 个 manual block、无主 guide。
**保留/新增**:新 fetch 脚本、新 transform、`engines/sglang-overlay/deepseek-ai/DeepSeek-V4-Flash.yaml`(PPU)、DeepSeek-V4-Flash 的 SGLang guide、7 个新 generated block。

## 6. 测试

- `src/lib/engines/__tests__/` 下为 `configToBlock` 写单测:喂一个精简 `config` fixture,断言 `model_id`/`tp_by_hardware`/`base_args`/`features`/`nightly_required`。覆盖:量化 `cookbookModel`、parser=`auto`、per-hw 不同 tp(8 vs 4)、未知硬件跳过。
- `attachEngines` overlay 深合并单测:generated + overlay → 合并后 `tp_by_hardware` 含 `thead_ppu_810e`,`hardware_overrides` 保留。
- `node scripts/build-recipes-api.mjs` 通过(模型数不变,SGLang 覆盖数变化符合预期)。
- `node scripts/snapshot-api.mjs --write` 重刷 golden。
- `node --test` 全绿(删除旧格式 transform 的测试,新增新格式测试)。

## 7. 不在本次范围(未来)

- **多量化变体**:把 config 的 bf16/fp8/nvfp4 映射成多个 block variant(各自 checkpoint + 额外 flag 如 Blackwell FP8 的 `--fp8-gemm-backend triton`)。需扩 block schema + 下游渲染。
- **docker / verified 徽章**:把 `config.dockerImages`、`cells[].verified` 带进 block 与 UI。
- **老格式模型的官方外链**:对仍是老组件格式、暂无我们 block 的模型,给一个「SGLang 官方 cookbook」外链入口(不自生成命令)。
- 一旦 upstream 把某老模型迁到新 config 格式,它会自动被新生成器接住,无需额外动作。

## 8. 交付方式

作为本次 `sync/upstream` PR(#31)的收尾提交,或另开分支/PR(视工作量与用户偏好),PR 目标 `weetime/recipes`(遵循 fork 惯例)。
