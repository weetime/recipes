# 计划书：新增 "Image Selector" 页面

## Context（背景）

参照需求截图，新增一个 **GPUStack 镜像选择器** 页面：用户在左侧选择 GPU 类型、框架版本、推理后端、可选镜像，在右侧选择架构（AMD64/ARM64/Auto）和镜像仓库（Docker Hub/Quay.io），页面据此实时生成一组 `docker pull` 命令，并支持按节点角色（All / Server Node / Worker Node）切换过滤，以及一键复制和离线安装提示。

入口放在顶部导航栏 `Browse` 链接的**左侧**，导航名称为 **Image Selector**，路由为 `/image-selector`。

确认的决策：
- **数据来源：静态 YAML 文件，不用任何 API。** 与本项目首页一致——首页数据来自 `models/**.yaml`，经 `src/lib/recipes.js` 的 `getAllRecipes()` 读取（`fs.readFileSync` + `js-yaml` + 进程级 `cache`），SSG 静态生成、运行时不查库。本页照搬此模式：新建一份根目录 YAML 数据文件 + 一个 lib 读取器。
- **不做 URL 参数同步**：仅用组件内部 `useState`。
- 路由路径：`/image-selector`。

### 现有 YAML 能否复用为镜像数据？（已核查，结论：不能直接复用，需新建独立 YAML）
- `taxonomy.yaml` 只定义**硬件画像**（`hardware_profiles`：各 GPU 的 `brand` / `vram_gb` / `generation` 等），含 NVIDIA / AMD / Ascend / Hygon / Iluvatar / T-Head(Alibaba) / Kunlunxin / Cambricon 的 `brand` 命名，但**没有任何容器镜像引用**，且缺 MetaX、MThreads。
- docker 镜像引用零散分布在各 model YAML 的 `dependencies:` 块（如 `quay.io/ascend/vllm-ascend`、Hygon 的 `image.sourcefind.cn:5000/...`）和 `src/lib/command-synthesis.js` 的 `DEFAULT_IMAGE` 默认值里，**没有集中目录**，结构与 GPUStack 镜像矩阵也不匹配。
- 故**新建独立的 `gpustack-images.yaml`**，GPU 类型命名可参考 `taxonomy.yaml` 的 `brand` 值保持一致，但数据本身全新编写。截图可见值作占位种子，用户后续替换/补全真实数据时只改这一个 YAML。

## 复用的现有模式

- YAML 读取器：仿 `src/lib/taxonomy.js`（根目录单文件 YAML + `cache` + `yaml.load(fs.readFileSync(...))`）与 `src/lib/platforms.js`。
- 首页/Browse 的 server component 取数模式：`src/app/browse/page.js`、`src/app/[org]/[repo]/page.js` 在 server 端调 loader，再把数据序列化传给客户端组件。
- UI 模式（均来自 `src/components/recipes/CommandBuilder.jsx`，内部函数未导出，故在新组件内重建同款小组件，避免改动 CommandBuilder）：
  - `Pill`（切换按钮，`CommandBuilder.jsx:1897`）— GPU 类型、架构、registry
  - `ConfigRow` + `PillGroup`（`CommandBuilder.jsx:1865 / 1886`）— 配置行布局
  - `CopyButton`（`CommandBuilder.jsx:71`）— 复制命令
  - 基于 `useState` 的按钮式标签页（`CommandBuilder.jsx:2237` MultiNodeBlock）— All / Server / Worker
  - 命令块样式：`rounded-2xl overflow-hidden bg-[var(--command-bg)] border border-border` + `--command-fg`
  - 复选框样式（`CommandBuilder.jsx:1788`）— 推理后端、可选镜像
  - 页面容器：`max-w-[1480px] mx-auto px-4 sm:px-6 py-8`（同 `src/app/browse/page.js:52`）
  - UI 原语：`src/components/ui/card.jsx`、`tooltip.jsx`（`InfoTip`，用于 `i` 图标）

## 要修改/新增的文件

### 1. 导航入口 — `src/app/layout.js`（第 115 行）
在 `Browse` 链接**之前**插入一行，沿用同款 className：
```jsx
<Link href="/image-selector" className="hover:text-foreground transition-colors hidden sm:inline">Image Selector</Link>
<Link href="/browse" className="hover:text-foreground transition-colors hidden sm:inline">Browse</Link>
```

### 2. 数据文件 — `gpustack-images.yaml`（新建，仓库根目录，与 `taxonomy.yaml` 同级）
集中定义全部选择器数据；占位值依据截图，用户后续替换/补全只改此文件。结构示意：
```yaml
gpu_types:                       # GPU 类型；frameworks 为该类型可用框架版本 id
  - { id: nvidia,    label: NVIDIA,     frameworks: [cuda13.0] }
  - { id: amd,       label: AMD,        frameworks: [] }
  - { id: ascend,    label: Ascend,     frameworks: [] }
  - { id: hygon,     label: Hygon,      frameworks: [] }
  - { id: mthreads,  label: MThreads,   frameworks: [] }
  - { id: iluvatar,  label: Iluvatar,   frameworks: [] }
  - { id: cambricon, label: Cambricon,  disabled: true, note: "...", frameworks: [] }
  - { id: metax,     label: MetaX,      frameworks: [] }
  - { id: thead,     label: "T-Head PPU", frameworks: [] }

frameworks:                      # 框架版本字典
  cuda13.0: { label: "CUDA 13.0" }

backends:                        # 推理后端；勾选后生成 runner 镜像
  - { id: vllm0.22.1,        label: "vLLM 0.22.1" }
  - { id: vllm0.21.0,        label: "vLLM 0.21.0" }
  # ... 0.20.2 / 0.19.1 / 0.18.1
  - { id: sglang0.5.12.post1, label: "SGLang 0.5.12.post1" }

# runner 镜像 tag 模板：`${framework}-${backend}` → gpustack/runner:cuda13.0-vllm0.22.1
image_catalog:                   # node: both|server|worker → 决定标签页过滤
  - { key: core,      comment: "GPUStack Image - core service, required for both Server and Worker nodes",
      image: gpustack/gpustack, tag: v2.2.0, node: both }
  - { key: pause,     comment: "Pause Image - shared network/IPC for model instance containers",
      image: gpustack/runtime, tag: pause, node: worker }
  - { key: benchmark, comment: "Benchmark Image - model performance benchmarks",
      image: gpustack/benchmark-runner, tag: v0.0.3, node: worker }
  - { key: gateway,   comment: "Gateway Images - Kubernetes deployment only", k8s_only: true, node: server,
      images: [gpustack/higress-plugins:0.2.3.post5, gpustack/mirrored-higress-higress:2.1.9,
               gpustack/mirrored-higress-pilot:2.1.9, gpustack/mirrored-higress-gateway:2.1.9] }

optional_images:
  - { id: postgres,   label: PostgreSQL, node: server, image: "...", tag: "..." }
  - { id: monitoring, label: "Monitoring (Prometheus + Grafana)", node: server, images: [...] }

registries:                      # registry 前缀
  dockerhub: { label: "Docker Hub", prefix: "" }
  quay:      { label: "Quay.io",   prefix: "quay.io/" }

architectures:                   # auto => 省略 --platform
  amd64: linux/amd64
  arm64: linux/arm64
  auto:  null
```

### 3. 读取器 — `src/lib/gpustack-images.js`（新建，仿 `src/lib/taxonomy.js`）
```js
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
let cache = null;
const PATH = path.join(process.cwd(), "gpustack-images.yaml");
export function loadGpuStackImages() {
  if (cache) return cache;
  cache = yaml.load(fs.readFileSync(PATH, "utf8"));
  return cache;
}
```

### 4. 页面外壳 — `src/app/image-selector/page.js`（新建，server component）
仿 `src/app/browse/page.js`：导出 `metadata`，在 server 端调 `loadGpuStackImages()`，渲染 `max-w-[1480px] ...` 容器 + 标题 + `<ImageSelector data={images} />`。
> 关键：读取器用 `fs`，只能在 server 跑；client 组件**不能** import 它，数据必须由 page 作为 prop 传入。

### 5. 交互组件 — `src/components/recipes/ImageSelector.jsx`（新建，`"use client"`）
接收 `data` prop（来自 YAML）。状态（仅内部 `useState`，无 URL 同步）：
- `gpuType`（默认 `"nvidia"`）、`framework`（默认该类型首个框架）
- `backends: string[]`、`optional: string[]`（复选框）
- `arch`（默认 `"amd64"`）、`registry`（默认 `"dockerhub"`）、`nodeTab`（默认 `"all"`）

布局：左右两栏（响应式，移动端堆叠），左 "Configuration"、右 "Required Images"。
- 左栏：GPU Type（`Pill` 网格，`disabled` 项置灰 + `InfoTip` 显示 note）、Framework Version（`<select>`，选项随 gpuType 变化）、Inference Backend（复选框）、Optional Images（复选框 + `InfoTip`）。
- 右栏：Architecture（`Pill`）、Registry（`Pill`）、All/Server/Worker 标签页、深色命令块（`bg-[var(--command-bg)]`）渲染 `docker pull` 命令（带 `#` 注释分组）、右上角 `CopyButton` 复制全部、底部 `<details>` "Need offline installation?" 折叠区。

命令生成（纯函数 `buildCommands(state, data)`）：
- 平台前缀：`arch==="auto"` 省略 `--platform`，否则 `--platform <architectures[arch]>`。
- registry 前缀拼接到镜像名前。
- core / pause / benchmark / gateway / optional 依 `node` 角色、`k8s_only`、勾选状态产出命令；每个勾选 backend 产出 `gpustack/runner:${framework}-${backend}`。
- 按 `nodeTab` 过滤（`all` 全显示；`server`/`worker` 仅对应角色，`both` 两者都显示）。
- 输出带注释分组文本，`CopyButton` 复制时保留注释（更贴近截图）。

切换 GPU 类型时，若当前 `framework` 不在新类型的 `frameworks` 中，重置为新类型首个框架。

## 验证

1. `node scripts/build-recipes-api.mjs` — 确认未破坏 recipe 流水线（应仍打印 `✓ JSON API: N models, 7 strategies`；本改动不涉及 `models/`，预期无影响。新 `gpustack-images.yaml` 不是 model，不会被该脚本扫描）。
2. `pnpm lint` — ESLint 通过。
3. 访问 `http://localhost:3000/image-selector`（dev server 已在运行，HMR 自动加载）：
   - 顶部导航出现 "Image Selector" 且在 "Browse" 左侧，点击可跳转。
   - 切换 GPU 类型 → Framework 下拉选项随之变化；Cambricon 置灰不可选并显示提示。
   - 勾选/取消推理后端、可选镜像 → 右侧命令实时增减。
   - 切换 Architecture / Registry → `--platform` 与 registry 前缀实时更新；Auto 省略 `--platform`。
   - 切换 All / Server Node / Worker Node → 命令按节点角色过滤。
   - Copy → 复制全部命令并显示 "Copied" 反馈。
   - 展开 "Need offline installation?" → 显示离线安装说明。
   - 改 `gpustack-images.yaml` 后刷新页面，命令随数据变化（验证 YAML 即数据源）。
4. 移动端窄屏检查左右栏堆叠、导航项在 `sm` 以下隐藏。

## 注意事项

- 不杀/不重启 dev server，不为每次改动跑 `pnpm build`（遵循 CLAUDE.md 约定）。
- 不导出/不改动 `CommandBuilder.jsx`；在新组件内重建同款小组件以隔离影响。
- `gpustack-images.yaml` 放仓库根目录（与 `taxonomy.yaml` 同级），随源码提交（区别于生成产物 `public/`）。
- 提交时用 `git commit -s`（DCO 签名）。
