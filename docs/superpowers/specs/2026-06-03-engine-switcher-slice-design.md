# Engine Switcher Vertical Slice — Design Addendum

- 日期: 2026-06-03
- 状态: 已批准设计,待实现计划
- 父设计: `docs/superpowers/specs/2026-06-03-unify-vllm-sglang-recipes-design.md`(Approach B)
- 目标: 在同一个模型页面上切换 vLLM / SGLang 两个推理引擎并看到各自的启动命令。这是父设计 P2→P3→P4 的一个**端到端竖切片**:只覆盖 2 个手写模型,把"数据 → join → UI 切换"整条链路跑通,验证体验与抽象,再由后续 PR 用 transformer 铺全量。

## 排序决策(brainstorming 输出)

先做竖切片(1-2 个模型走通),而非先全量 vendor + transformer。理由:最快看到"同页切换"且先验证 UI/join 的正确性,不被上游 sgl-cookbook 的 schema 脏数据阻塞。全量 transformer(P2 完整版)、sync CI(P5)、SGLang-only 模型留到切片验证之后。

## 切片范围

- **模型**: `deepseek-ai/DeepSeek-V3`(SGLang 的标杆模型)和 `Qwen/Qwen3-235B-A22B-Instruct-2507`。两者在本仓库已有 vLLM recipe,且 SGLang 启动命令文档充分。
- **引擎**: vLLM(现状)+ SGLang(新增手写数据)。
- **并行策略**: 仅 `single_node_tp` + `multi_node_tp`。SGLang 的 DEP/EP/PD 留到 transformer 落地后。
- **不做**: 全量 transformer、`upstream/sglang/` vendor、sync CI、SGLang-only 模型进站。

## 组件设计

### 1. SGLang 引擎块(手写,真实 schema)

新增生成树位置(父设计):`engines/sglang/<hf_org>/<hf_repo>.yaml`。切片阶段手写,头部标注 `# hand-authored slice — P2 transformer will generate this`。Schema 小而声明式,**复用共享的 `taxonomy` 硬件 id 与策略 id**:

```yaml
# hand-authored slice — P2 transformer will generate this
engine: sglang
model_id: deepseek-ai/DeepSeek-V3
min_version: "0.4.6"
serve_binary: "python3 -m sglang.launch_server"
base_args: ["--trust-remote-code"]
variants:
  default: { precision: bf16 }
strategies:                      # 仅 TP,复用我们的策略 id
  single_node_tp: {}
  multi_node_tp:
    extra: ["--nnodes", "{NNODES}", "--node-rank", "{RANK}", "--dist-init-addr", "$HEAD_IP:5000"]
features:
  reasoning:    { args: ["--reasoning-parser", "deepseek-r1"] }
  tool_calling: { args: ["--tool-call-parser", "deepseek"] }
```

字段说明:
- `serve_binary` — SGLang 启动二进制,默认 `python3 -m sglang.launch_server`。
- SGLang 用 `--model-path <id>` 指定模型(不同于 vLLM 的位置参数 `vllm serve <id>`)。
- `--tp` 由适配器从硬件 `gpu_count` 计算,不写死在 YAML(单节点=gpu_count,多节点=total_gpus)。
- `{NNODES}`/`{RANK}` 是模板占位符,由适配器在多节点渲染时替换。
- `features` 的 `args` 直接追加到命令尾部。

### 2. SGLang 适配器 `src/lib/engines/sglang/index.js`

实现 P1 的 `EngineAdapter` 契约(`id`/`synthesize`/`synthesizeOmni`/`capabilities`)。

- `synthesize(recipe, variantKey, strategyName, hwId, features, strategies, taxonomy, advancedArgs, nodeCount, pdNodes)`:
  - 读 `recipe.engines.sglang` 引擎块。
  - 从**共享 taxonomy** 取 `gpu_count` 计算 `--tp`(单节点 `tp=gpu_count`;`multi_node_tp` 且 `nodeCount>1` 时 `tp=gpu_count*nodeCount`,并渲染 head/worker 两份命令)。
  - 拼接 `serve_binary` + `--model-path <model_id>` + `base_args` + `--tp <n>` + 策略 `extra`(填占位符)+ 选中 features 的 `args` + advancedArgs。
  - 返回与 vLLM **同形** 的结果:`{ deployType, command, argv, env }`(单节点)或 `{ deployType:"multi_node", headCommand, workerCommand, headArgv, workerArgv, env }`(多节点)。同形是关键——CommandBuilder 现有的命令框/复制/docker 包装可原样复用。
- `synthesizeOmni`:切片不支持 SGLang omni,提供一个抛 `Error("sglang omni not supported")` 的占位实现以满足契约(omni 模型不会进入 SGLang 路径)。
- `capabilities(block)`:返回 `{ variants, strategies, features, multiNode, pd:false }`,从引擎块读取,驱动 UI 显示哪些选择行。

注册:在 `src/lib/engines/index.js` 的 `REGISTRY` 加一行 `import sglang` + `[sglang.id]: sglang`。

### 3. Join(P3-lite)

两处都要 join,保持 UI 与 JSON API 一致:

- `src/lib/recipes.js` 的 `parseRecipe`:解析 `models/*.yaml` 后,探测 `engines/sglang/<hf_id>.yaml`。存在则挂 `recipe.engines = { vllm: { min_version: recipe.model?.min_vllm_version || null }, sglang: <块> }` 与 `recipe.default_engine = "vllm"`;不存在则不加 `engines` 键(单引擎=今日行为)。
- `scripts/build-recipes-api.mjs`:同样的探测,把 `engines` map 写进 per-model JSON。受 golden snapshot 守护——**只有 2 个切片模型的 JSON 应当变化**,其余 7638 个文件必须字节不变。因此本切片需要在改 join 后**重新生成 golden**(`pnpm snapshot:api:write`),并在 review 中人工确认 diff 仅限这 2 个模型 + 新增的 sglang JSON。

**关键:不要把 recipe 自身放进 `engines.vllm`。** CommandBuilder 是 client component,`recipe` prop 会被 Next 序列化用于 hydration,自引用会导致 circular-JSON 崩溃。因此 `engines.vllm` 只放一个**轻量描述符**(`{ min_version }`)用于渲染 pill;vLLM 的命令合成仍读 `recipe` 顶层字段(`command-synthesis` 行为不变),SGLang 的合成读 `recipe.engines.sglang` 块。两条路径都不持有 recipe 的循环引用。

### 4. CommandBuilder 引擎切换器(P4-slice)

- 在 Hardware 行之上加一行 **Engine pill**(`vLLM | SGLang`),仅当 `recipe.engines` 有 2 项时渲染(其余模型外观不变)。
- 新增 state `engine`(默认 `recipe.default_engine || "vllm"`),同步到 URL `?engine=`,复用现有 pill-row + URL 同步模式。
- 合成 memo:由直接调 `resolveCommand(...)` 改为 `resolveCommandForEngine(engine, recipe, variant, strategy, hwId, features, strategies, taxonomy, ...)`。
- 选择轴来源变成引擎感知,集中在一个纯函数 `engineSources(recipe, engineId)`(放 `src/lib/engine-ui.js`,可单测):
  - **Hardware 行共享**(同一 taxonomy)。
  - **Variant / Strategy / Features 行**:`engine === "sglang"` 时从 `recipe.engines.sglang`(variants/strategies/features keys)取;`engine === "vllm"` 时从 `recipe` 顶层字段(`variants`/`compatible_strategies`/`features`)取。该函数同时返回每个引擎的默认选择(策略=首个;features=默认全开减 opt-in;variant=default)。
  - 切引擎时,目标引擎不支持的选择回落到该引擎默认(策略→该引擎第一个策略;features→该引擎默认全开减 opt-in;variant→default)。
- 降级:无 `recipe.engines` 或只有一个引擎 → 不渲染 Engine 行,`default_engine` 决定首屏(=今日行为)。

风险点在本组件(2194 行)里穿一条 `engine` 维度。设计通过"共享 Hardware 行 + 同形返回值"把改动面收敛到 variant/strategy/features 三行的**数据来源**,不动命令渲染、复制、docker、PD/多节点 tab 等下游。

## 验证方式

- `node --test` 全绿(P1 的 11 个 + 新增 sglang 适配器测试)。
- `node scripts/build-recipes-api.mjs && node scripts/snapshot-api.mjs`:重生成 golden 后,snapshot 通过;**人工确认 golden diff 仅涉及 2 个切片模型的 vLLM JSON 新增 `engines` 键 + 2 个新增 sglang 相关 JSON**,无其它模型变动。
- 手动:`pnpm dev`,打开 `/deepseek-ai/DeepSeek-V3`,看到 Engine 行;切到 SGLang 显示 `python3 -m sglang.launch_server --model-path … --tp 8 …`;切回 vLLM 显示 `vllm serve …`。

## 开放问题 / 后续

- SGLang 具体 flag(reasoning/tool-call parser 名、多节点 `--dist-init-addr` 端口)以 SGLang 官方文档为准,实现时核对。
- 全量 transformer(P2)、`upstream/sglang/` vendor、sync CI(P5)、SGLang DEP/EP/PD、SGLang-only 模型进站——切片验证通过后各自独立 PR。

### 切片实现中 review 发现、留给 P2 的具体 follow-up

- **`featuresToUrl` 引擎感知**(`CommandBuilder.jsx`)。它把当前 features 与 `defaultFeaturesFor(hw)`(读 vLLM 的 `recipe.features`/`opt_in_features`)比较来决定是否写 `?features=`。两个切片模型的 vLLM/SGLang feature key 集合恰好一致且 opt-in 为空,所以**目前是巧合正确**;若未来某个 SGLang 块的 feature/opt-in 集与 vLLM 分叉,SGLang 下切换 feature 会写出错误的 URL 参数(命令本身仍正确,仅 URL 持久化错)。需让默认比较引擎感知。
- **挂载恢复(mount-restore)是 vLLM 形状的**(`CommandBuilder.jsx`)。`?engine=sglang` deep-link + localStorage 存了 per-recipe `rs.strategy` 时,恢复逻辑用 vLLM 的 `compatible_strategies` 校验并设 `strategyOverride`。共享 id(如 `multi_node_tp`)无害;vLLM 独有 id(`pd_cluster`/`tep`/`dep`)会回落到 SGLang 的 `single_node_tp`,不崩但可能 misfire。需让恢复引擎感知。两者都不阻塞切片(命令渲染正确)。
