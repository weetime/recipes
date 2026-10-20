import { readFileSync } from "node:fs";
import path from "node:path";

const REPORTS = [
  {
    slug: "glm-5-3-flash-rtx-pro-5000",
    modelId: "zai-org/GLM-5.3-Flash",
    modelName: "GLM-5.3-Flash",
    title: "NVFP4 serving on RTX PRO 5000",
    href: "/reports/glm-5-3-flash-rtx-pro-5000/index.html",
    date: "2026-10-16",
    hardware: "8× RTX PRO 5000 · 72 GB",
    topologyByLocale: { zh: "单机 · TP8 · 启用专家并行", en: "Single node · TP8 · expert parallel enabled" },
    engine: "vLLM 0.31.0",
    precision: "NVFP4",
    summary: "Fixed-length throughput, multi-turn Agent replay, open-loop load, and a two-hour stability run.",
    highlights: [
      { value: "895.30", unit: "tok/s", label: "8K / 2048 · C16" },
      { value: "18 / 18", unit: "points", label: "Primary points completed" },
      { value: "2 h", unit: "run", label: "Two-hour request replay" },
    ],
    caveat: "Synthetic fixed-length throughput, multi-turn replay, and open-loop traffic are distinct workloads; interpret each result with its test profile and sample count.",
  },
  {
    slug: "qwen38-flash-next-rtx-pro-5000-fp8",
    modelId: "Qwen/Qwen3.8-Flash-Next",
    modelName: "Qwen3.8-Flash-Next",
    title: "FP8 serving on RTX PRO 5000",
    href: "/reports/qwen38-flash-next-rtx-pro-5000-fp8/index.html",
    date: "2026-10-14",
    hardware: "4× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.1rc1",
    precision: "FP8",
    summary: "Fixed-length capacity, long-context tests, open-loop arrivals, and natural Agent trace replay.",
    highlights: [
      { value: "529.7", unit: "tok/s", label: "8K / 512 · C16" },
      { value: "408 / 408", unit: "requests", label: "Coding replay completed" },
      { value: "128K", unit: "context", label: "Long-context probe" },
    ],
    caveat: "Most extension points are single runs. Long-context points use 32 requests and do not support robust tail-latency estimates.",
  },
  {
    slug: "qwen38-flash-next-rtx-pro-5000-nvfp4",
    modelId: "Qwen/Qwen3.8-Flash-Next",
    modelName: "Qwen3.8-Flash-Next",
    title: "NVFP4 serving on RTX PRO 5000",
    href: "/reports/qwen38-flash-next-rtx-pro-5000-nvfp4/index.html",
    date: "2026-10-14",
    hardware: "4× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.1rc1",
    precision: "NVFP4",
    summary: "Fixed-length capacity, long-context tests, open-loop arrivals, and natural Agent trace replay.",
    highlights: [
      { value: "576.6", unit: "tok/s", label: "8K / 512 · C16" },
      { value: "437 / 437", unit: "requests", label: "Long-context replay completed" },
      { value: "128K", unit: "context", label: "Long-context probe" },
    ],
    caveat: "Most extension points are single runs. Long-context points use 32 requests and do not support robust tail-latency estimates.",
  },
  {
    slug: "qwen38-27b-mxfp8-950dt",
    modelId: "Qwen/Qwen3.8-27B",
    modelName: "Qwen3.8-27B",
    title: "W8A8-MXFP8 serving on Ascend 950DT",
    href: "/reports/qwen38-27b-mxfp8-950dt/index.html",
    date: "2026-10-16",
    hardware: "8× Ascend 950DT",
    engine: "vLLM-Ascend",
    precision: "W8A8-MXFP8",
    summary: "Text, business, long-context, vision, open-loop, Agent replay, and a separately scoped GPQA-Diamond evaluation.",
    highlights: [
      { value: "245.4", unit: "tok/s", label: "8K / 512 · C32" },
      { value: "51 / 51", unit: "points", label: "Formal performance points" },
      { value: "437 / 437", unit: "requests", label: "Agent replay completed" },
    ],
    caveat: "Eight independent TP1 services were used; there is no TP8 result. Co-run load changed between measurements, and GPQA is affected by a 16K output cap.",
  },
  {
    slug: "qwen38-27b-rtx-pro-5000-nvfp4",
    modelId: "Qwen/Qwen3.8-27B",
    modelName: "Qwen3.8-27B",
    title: "NVFP4 serving on RTX PRO 5000",
    href: "/reports/qwen38-27b-rtx-pro-5000-nvfp4/index.html",
    date: "2026-10-16",
    hardware: "8× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.0",
    precision: "NVFP4",
    summary: "Three-round fixed-length matrix, long-context probes, natural Agent replay, and open-loop arrivals.",
    highlights: [
      { value: "188.3", unit: "tok/s", label: "8K / 256 · C16" },
      { value: "256K", unit: "context", label: "32 requests at C1" },
      { value: "408 / 408", unit: "requests", label: "Coding replay completed" },
    ],
    caveat: "Eight GPUs hosted independent TP1 instances. Long-context points use 32 requests and are descriptive for those settings.",
  },
  {
    slug: "qwen38-27b-rtx-pro-5000-fp8",
    modelId: "Qwen/Qwen3.8-27B",
    modelName: "Qwen3.8-27B",
    title: "FP8 serving on RTX PRO 5000",
    href: "/reports/qwen38-27b-rtx-pro-5000-fp8/index.html",
    date: "2026-10-16",
    hardware: "8× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.0",
    precision: "FP8",
    summary: "Three-round fixed-length matrix, long-context probes, natural Agent replay, and open-loop arrivals.",
    highlights: [
      { value: "154.1", unit: "tok/s", label: "8K / 256 · C16" },
      { value: "256K", unit: "context", label: "32 requests at C1" },
      { value: "437 / 437", unit: "requests", label: "Long-context replay completed" },
    ],
    caveat: "Eight GPUs hosted independent TP1 instances. Several extended points have fewer repeats than the fixed-length matrix.",
  },
  {
    slug: "qwen38-27b-rtx-pro-5000-bf16",
    modelId: "Qwen/Qwen3.8-27B",
    modelName: "Qwen3.8-27B",
    title: "BF16 serving on RTX PRO 5000",
    href: "/reports/qwen38-27b-rtx-pro-5000-bf16/index.html",
    date: "2026-10-16",
    hardware: "8× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.0",
    precision: "BF16",
    summary: "Three-round fixed-length matrix, measured long-context range, natural Agent replay, and open-loop arrivals.",
    highlights: [
      { value: "81.0", unit: "tok/s", label: "8K / 256 · C8" },
      { value: "96K", unit: "context", label: "32 requests at C1" },
      { value: "437 / 437", unit: "requests", label: "Long-context replay completed" },
    ],
    caveat: "Eight GPUs hosted independent TP1 instances. No 128K/256K BF16 long-context point is included in the formal matrix.",
  },

  {
    slug: "qwen36-27b-w8a8-ascend-910b4",
    modelId: "Qwen/Qwen3.6-27B",
    modelName: "Qwen3.6-27B",
    title: "W8A8 long-context serving on Ascend 910B4",
    href: "/reports/qwen36-27b-w8a8-ascend-910b4/index.html",
    date: "2026-07-27", hardware: "8× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.18.0rc1", precision: "W8A8",
    summary: "250K input concurrency, parallel layouts, and ShareGPT request mix.",
    highlights: [{ value: "4,908", unit: "tok/s", label: "250K input · C2 aggregate" }, { value: "250K", unit: "input", label: "Longest measured prompt" }, { value: "634", unit: "tok/s", label: "ShareGPT output · C64" }],
    caveat: "250K concurrency points contain 2/4/8 requests; ShareGPT points have two observations each.",
  },
  {
    slug: "glm-5-2-w4a8-ppu-sglang", modelId: "zai-org/GLM-5.2", modelName: "GLM-5.2",
    title: "W4A8 serving on PPU with SGLang", href: "/reports/glm-5-2-w4a8-ppu-sglang/index.html",
    date: "2026-07-30", hardware: "8× PPU ZW810E", engine: "SGLang 0.5.12", precision: "W4A8",
    summary: "Three-run ShareGPT throughput and latency matrix across TP8 and DP attention configurations.",
    highlights: [{ value: "368.9", unit: "tok/s", label: "256 output · baseline C32" }, { value: "418.7", unit: "tok/s", label: "1,024 output · baseline C32" }, { value: "3", unit: "runs", label: "Median summary" }],
    caveat: "High-concurrency TTFT rises sharply in some configurations; peak throughput is not a production concurrency recommendation.",
  },
  {
    slug: "deepseek-v41-flash-mi308x", modelId: "deepseek-ai/DeepSeek-V4.1-Flash", modelName: "DeepSeek-V4.1-Flash",
    title: "Serving on AMD MI308X", href: "/reports/deepseek-v41-flash-mi308x/index.html",
    date: "2026-09-24", hardware: "8× AMD MI308X · 192 GB", engine: "vLLM ROCm nightly", precision: "ModelScope checkpoint",
    summary: "Fixed-load capacity, long-context profiles, open-loop arrivals, and BFCL tool-call replay.",
    highlights: [{ value: "825.6", unit: "tok/s", label: "512/256 saturated output" }, { value: "156.6", unit: "s", label: "TTFT P50 · 256K input" }, { value: "173.9", unit: "tok/s", label: "BFCL Agent trace" }],
    caveat: "Primary profiles are single runs; long-context points use 16 requests. Separate speculative-decoding batches are excluded.",
  },
  {
    slug: "glm-5-3-flash-fp8-mi308x", modelId: "zai-org/GLM-5.3-Flash", modelName: "GLM-5.3-Flash",
    title: "FP8 serving on AMD MI308X", href: "/reports/glm-5-3-flash-fp8-mi308x/index.html",
    date: "2026-09-25", hardware: "8× AMD MI308X · 192 GB", engine: "vLLM ROCm nightly", precision: "FP8",
    summary: "Short-input serving, open-loop arrivals, BFCL Agent replay, and the original path's context crash boundary.",
    highlights: [{ value: "3,120.8", unit: "tok/s", label: "512/256 saturated output" }, { value: "245.7", unit: "tok/s", label: "BFCL Agent trace · C8" }, { value: "~2K", unit: "tokens", label: "Original-path input limit" }],
    caveat: "At 2,100 input tokens the original path crashed; later long-context and multimodal points were not run. Patched results are separate.",
  },

  {
    slug: "glm-5-3-flash-w8a8-mxfp8-950dt", modelId: "zai-org/GLM-5.3-Flash", modelName: "GLM-5.3-Flash",
    title: "W8A8-MXFP8 Agent and long-context serving on Ascend 950DT", href: "/reports/glm-5-3-flash-w8a8-mxfp8-950dt/index.html",
    date: "2026-10-14", hardware: "8× Ascend 950DT · 64 GB", engine: "vLLM-Ascend 0.30.0rc2", precision: "W8A8-MXFP8",
    summary: "Agent trace replay, hot-prefix retrieval to 1M, and fixed-output decode concurrency.",
    highlights: [
      { value: "437 / 437", unit: "requests", label: "Agent C8 replay completed" },
      { value: "8 / 8", unit: "checks", label: "1M retrieval at C1/C2" },
      { value: "4.97 s", unit: "TTFT P95", label: "256K hot-prefix C8" },
    ],
    caveat: "Long-context points use eight requests and >200K is experimental on this stack; high prefix reuse means results are not cold-prefill latency.",
  },

  {
    slug: "minimax-h3-rtx-pro-6000", modelId: "MiniMax-H3", modelName: "MiniMax-H3",
    title: "BF16 video generation on RTX PRO 6000 Blackwell", href: "/reports/minimax-h3-rtx-pro-6000/index.html",
    date: "2026-09-01", hardware: "8× RTX PRO 6000 Blackwell · 96 GB", engine: "vLLM-Omni / SGLang", precision: "BF16",
    summary: "Video-generation latency across 2/4/8-GPU configurations.",
    topologyByLocale: { zh: "TP2 · 序列并行 · 2 / 4 / 8 卡配置", en: "TP2 · sequence parallel · 2 / 4 / 8 GPUs" },
    listMetricByLocale: {
      en: { label: "4-GPU T2VA render time · SGLang", value: "175.6", unit: "s", profile: "1344×768 · 124 frames · 50 steps · n=3" },
      zh: { label: "4 卡 T2VA 生成耗时 · SGLang", value: "175.6", unit: "秒", profile: "1344×768 · 124 帧 · 50 步 · n=3" },
    },
    curveByLocale: {
      en: { title: "T2VA render time · SGLang · lower is faster", labels: ["2 GPUs", "4 GPUs", "8 GPUs"], values: [295.6, 175.6, 120.1], unit: "s" },
      zh: { title: "T2VA 生成耗时 · SGLang · 越低越快", labels: ["2 卡", "4 卡", "8 卡"], values: [295.6, 175.6, 120.1], unit: "秒" },
    },
    caveat: "The report is a video-generation benchmark, not a text-token throughput test. Results were measured after fixing a PCIe ACS issue; host-specific paths and registry details are redacted.",
  },

  {
    slug: "qwen3-32b-sharegpt-ascend-910b4", modelId: "Qwen/Qwen3-32B", modelName: "Qwen3-32B",
    title: "BF16 ShareGPT serving across three engines", href: "/reports/qwen3-32b-sharegpt-ascend-910b4/index.html",
    date: "2026-06-30", hardware: "8× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend / MindIE / SGLang", precision: "BF16",
    summary: "Three-run ShareGPT matrix at five concurrency levels, including throughput and latency tails.",
    highlights: [{ value: "1,228", unit: "tok/s", label: "vLLM-Ascend · C128" }, { value: "45 / 45", unit: "points", label: "0% reported errors" }, { value: "3", unit: "engines", label: "Same checkpoint and workload" }],
    caveat: "Cross-engine cache and scheduler telemetry uses non-equivalent normalization and is excluded; client metrics are three-run medians.",
  },
  {
    slug: "minimax-m27-w8a8-910b4", modelId: "MiniMaxAI/MiniMax-M2.7", modelName: "MiniMax-M2.7",
    title: "W8A8 QuaRot serving on Ascend 910B4", href: "/reports/minimax-m27-w8a8-910b4/index.html",
    date: "2026-08-25", hardware: "8× Ascend 910B4 · 64 GB", engine: "vLLM-Ascend 0.23.0rc1", precision: "W8A8 QuaRot",
    summary: "Closed-loop serving, Agent trace replay, open-loop capacity SLO, and batch-budget sensitivity.",
    highlights: [{ value: "2.25", unit: "req/s", label: "Preregistered safe rate · 512/256" }, { value: "235 / 235", unit: "requests", label: "Agent replay · 16 sessions" }, { value: "91.51%", unit: "prefix hit", label: "Agent trace replay" }],
    caveat: "TTFT P95 has notable rerun variation; safe rate follows the preregistered repeat criterion, not a universal service guarantee.",
  },

  {
    slug: "qwen3-32b-w8a8-ascend-910b4", modelId: "Qwen/Qwen3-32B", modelName: "Qwen3-32B",
    title: "W8A8 serving on Ascend 910B4", href: "/reports/qwen3-32b-w8a8-ascend-910b4/index.html",
    date: "2026-08-24", hardware: "4× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.26.0rc", precision: "W8A8",
    summary: "Single-stream latency, high-generation throughput, ShareGPT, long context, Agent replay, and open-loop capacity.",
    highlights: [{ value: "1,529", unit: "tok/s", label: "1024/2048 · C64 output" }, { value: "17.68", unit: "ms", label: "Single-stream TPOT" }, { value: "4.97", unit: "req/s", label: "Open-loop safe rate" }],
    topologyByLocale: { zh: "单机 · TP4 · 官方 A2 配方（Agent 为独立自配方）", en: "Single node · TP4 · official A2 recipe (Agent uses a separate custom recipe)" },
    listMetricByLocale: {
      en: { label: "C1 single-stream output · 1024/128", value: "52.9", unit: "tok/s", profile: "TPOT 17.68 ms · n=100" },
      zh: { label: "C1 单流输出 · 1024/128", value: "52.9", unit: "tok/s", profile: "TPOT 17.68 ms · n=100" },
    },
    caveat: "Workloads use distinct official deployment recipes; Agent replay uses a separate custom recipe. Do not connect the points as a concurrency curve.",
  },
  {
    slug: "qwen3-30b-a3b-w8a8-ascend-910b3", modelId: "Qwen/Qwen3-30B-A3B", modelName: "Qwen3-30B-A3B",
    title: "W8A8 serving on Ascend 910B3", href: "/reports/qwen3-30b-a3b-w8a8-ascend-910b3/index.html",
    date: "2026-08-25", hardware: "4× Ascend 910B3 · 64 GB", engine: "vLLM-Ascend", precision: "W8A8",
    summary: "Single-stream EAGLE3 A/B, high-generation and saturated workloads, long context, Agent replay, and open-loop capacity.",
    highlights: [{ value: "2,715", unit: "tok/s", label: "1024/2048 · C64 output" }, { value: "12.36", unit: "ms", label: "Single-stream TPOT" }, { value: "2.80", unit: "req/s", label: "Open-loop safe rate" }],
    topologyByLocale: { zh: "单机 · TP4 · EP · EAGLE3", en: "Single node · TP4 · EP · EAGLE3" },
    listMetricByLocale: {
      en: { label: "C1 single-stream output · 1024/128", value: "70.97", unit: "tok/s", profile: "EAGLE3 on · TPOT 12.36 ms" },
      zh: { label: "C1 单流输出 · 1024/128", value: "70.97", unit: "tok/s", profile: "EAGLE3 开启 · TPOT 12.36 ms" },
    },
    curveByLocale: {
      en: { title: "Single-stream EAGLE3 output rate", labels: ["Off", "On"], values: [60.32, 70.01], unit: "tok/s" },
      zh: { title: "单流 EAGLE3 输出吞吐", labels: ["关闭", "开启"], values: [60.32, 70.01], unit: "tok/s" },
    },
    caveat: "Primary points are single-run measurements. P95 values in high-generation and long-context closed-loop batches are affected by startup transients.",
  },
  {
    slug: "qwen3-vl-8b-w8a8-ascend-910b3", modelId: "Qwen/Qwen3-VL-8B-Instruct", modelName: "Qwen3-VL-8B-Instruct",
    title: "W8A8 multimodal serving on Ascend 910B3", href: "/reports/qwen3-vl-8b-w8a8-ascend-910b3/index.html",
    date: "2026-09-17", hardware: "1× Ascend 910B3 · 64 GB", engine: "vLLM-Ascend", precision: "W8A8",
    summary: "Image resolution, text and multimodal latency, long-context serving, and open-loop rates.",
    highlights: [{ value: "2.44", unit: "s", label: "1080p image · median TTFT" }, { value: "12.87", unit: "ms", label: "Text · C1 TPOT" }, { value: "1.75", unit: "req/s", label: "1080p open-loop safe rate" }],
    topologyByLocale: { zh: "单卡 · TP1 · DP1", en: "Single card · TP1 · DP1" },
    listMetricByLocale: {
      en: { label: "Single-stream text output · 128/128", value: "73.1", unit: "tok/s", profile: "C1 · median TPOT 12.87 ms" },
      zh: { label: "单流文本输出 · 128/128", value: "73.1", unit: "tok/s", profile: "C1 · TPOT 中位数 12.87 ms" },
    },
    curveByLocale: {
      en: { title: "Median TTFT by image profile", labels: ["Text", "256²", "720p", "1080p"], values: [119.7, 357, 995.4, 2436.2], unit: "ms" },
      zh: { title: "不同图像输入的 TTFT 中位数", labels: ["文本", "256²", "720p", "1080p"], values: [119.7, 357, 995.4, 2436.2], unit: "ms" },
    },
    caveat: "This A2-format W8A8 checkpoint/hardware pairing is not listed in the official recipe. Vision throughput and text-only latency use different input profiles.",
  },
  {
    slug: "qwen36-27b-w8a8-concurrency-context-910b4", modelId: "Qwen/Qwen3.6-27B", modelName: "Qwen3.6-27B",
    title: "Concurrency × context serving on Ascend 910B4", href: "/reports/qwen36-27b-w8a8-concurrency-context-910b4/index.html",
    date: "2026-07-30", hardware: "8× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.24.0", precision: "W8A8",
    summary: "A 37-point concurrency and context matrix, plus matched 64/512-token output tests.",
    highlights: [{ value: "5,798", unit: "input tok/s", label: "32K · C16 · TPOT ≤150 ms" }, { value: "37", unit: "points", label: "Primary matrix · 0 preemptions" }, { value: "512", unit: "tokens", label: "Agent-shaped output extension" }],
    topologyByLocale: { zh: "单机 · TP4×2 · DP2", en: "Single node · TP4×2 · DP2" },
    curveByLocale: {
      en: { title: "Input throughput at TPOT SLO boundary", labels: ["32K · C16", "64K · C8", "128K · C4"], values: [5798, 5639, 4843], unit: "input tok/s" },
      zh: { title: "TPOT SLO 边界上的输入吞吐", labels: ["32K · C16", "64K · C8", "128K · C4"], values: [5798, 5639, 4843], unit: "输入 tok/s" },
    },
    caveat: "The concurrency scan uses a discrete grid; reported limits are the highest measured points within TPOT ≤150 ms, not exact continuous capacity boundaries.",
  },
  {
    slug: "qwen36-27b-w8a8-dcp-context-910b4", modelId: "Qwen/Qwen3.6-27B", modelName: "Qwen3.6-27B",
    title: "DCP and context length on Ascend 910B4", href: "/reports/qwen36-27b-w8a8-dcp-context-910b4/index.html",
    date: "2026-08-04", hardware: "8× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.24.0", precision: "W8A8",
    summary: "Matched DCP=1/2 measurements across 64K, 128K, and 250K inputs at concurrency 1/2/4.",
    highlights: [{ value: "31.2%", unit: "lower TPOT", label: "250K · C1 · DCP 1→2" }, { value: "+30%", unit: "TTFT", label: "250K · C4 · DCP 1→2" }, { value: "18", unit: "points", label: "Main matrix" }],
    topologyByLocale: { zh: "单机 · TP8×1 · DCP 1 / 2", en: "Single node · TP8×1 · DCP 1 / 2" },
    curveByLocale: {
      en: { title: "TPOT at C1 by context length", labels: ["64K", "128K", "250K"], values: [45, 59, 85], unit: "ms · DCP=1" },
      zh: { title: "C1 下不同上下文长度 TPOT", labels: ["64K", "128K", "250K"], values: [45, 59, 85], unit: "ms · DCP=1" },
    },
    caveat: "Concurrency was measured up to C4; saturated throughput was not measured. This report describes fixed-work latency, not saturation capacity.",
  },
  {
    slug: "qwen38-27b-bf16-reasoning-effort-ascend-910b3", modelId: "Qwen/Qwen3.8-27B", modelName: "Qwen3.8-27B",
    title: "BF16 reasoning-effort serving cost on Ascend 910B3", href: "/reports/qwen38-27b-bf16-reasoning-effort-ascend-910b3/index.html",
    date: "2026-08-15", hardware: "8× Ascend 910B3 · 64 GB", engine: "vLLM-Ascend 0.23.0rc1", precision: "BF16",
    summary: "Difficulty-stratified latency, output length, and answer-rate measurements for four reasoning-effort settings.",
    highlights: [{ value: "5.07×", unit: "E2E", label: "Hard · C32 · xhigh/medium" }, { value: "0.24–0.38×", unit: "answers/s", label: "xhigh relative to low" }, { value: "3", unit: "repeats", label: "Independent measurements" }],
    topologyByLocale: { zh: "单机 · TP4 · prefix cache 关闭", en: "Single node · TP4 · prefix cache off" },
    curveByLocale: {
      en: { title: "Hard prompts · median E2E time", labels: ["C1", "C8", "C32"], values: [287.6, 435.8, 606.9], unit: "s · xhigh" },
      zh: { title: "Hard 题 · E2E 中位数", labels: ["C1", "C8", "C32"], values: [287.6, 435.8, 606.9], unit: "秒 · xhigh" },
    },
    caveat: "This is a serving-cost study for one BF16 checkpoint and prompt set, not a comparison across models. p99 and C32 TTFT are not used as conclusions.",
  },


  {
    slug: "qwen3-8b-bf16-arrival-model-910b3", modelId: "Qwen/Qwen3-8B", modelName: "Qwen3-8B",
    title: "BF16 arrival-model calibration on Ascend 910B3", href: "/reports/qwen3-8b-bf16-arrival-model-910b3/index.html",
    date: "2026-08-25", hardware: "1× Ascend 910B3 · 64 GB", engine: "vLLM-Ascend 0.19.1rc2", precision: "BF16",
    summary: "Closed-loop saturation and three open-loop arrival processes measured with a fixed 512/256 request profile.",
    highlights: [{ value: "2.788", unit: "req/s", label: "Poisson · P99 ≤427 ms · n=3" }, { value: "8.11", unit: "req/s", label: "Closed-loop completion · not capacity" }, { value: "3", unit: "arrival models", label: "Same deployment and request shape" }],
    topologyByLocale: { zh: "单卡 · TP1 · 同一部署对照到达模型", en: "Single card · TP1 · matched arrival-model comparison" },
    caveat: "Constant and true-Poisson safe_rps values are lower bounds at the 427 ms P99 threshold; they are not directly comparable with the confirmed guidellm Poisson boundary.",
  },
  {
    slug: "qwen36-27b-w8a8-mtp-tpdp-910b4", modelId: "Qwen/Qwen3.6-27B", modelName: "Qwen3.6-27B",
    title: "W8A8 topology and MTP serving on Ascend 910B4", href: "/reports/qwen36-27b-w8a8-mtp-tpdp-910b4/index.html",
    date: "2026-07-23", hardware: "8× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.18.0rc1", precision: "W8A8",
    summary: "Matched topology runs, clean MTP retests, asynchronous scheduling, and text versus image-text workloads.",
    highlights: [{ value: "713", unit: "tok/s", label: "TP4×2 · peak aggregate" }, { value: "1.63×", unit: "C1 output", label: "MTP k=3 · clean retest" }, { value: "−17%", unit: "C96 output", label: "MTP k=3 vs off" }],
    topologyByLocale: { zh: "8 卡单机 · TP8×1 / TP4×2 / TP2×4 分阶段测试", en: "Single 8-card node · TP8×1 / TP4×2 / TP2×4 tested in stages" },
    caveat: "Topology and MTP are separate experiment phases; the headline throughput is not an end-to-end production guarantee. The clean retest supersedes the earlier single-run MTP ratio.",
  },
  {
    slug: "minimax-h3-ascend-910b4", modelId: "MiniMax-H3", modelName: "MiniMax-H3",
    title: "T2VA video generation on Ascend 910B4", href: "/reports/minimax-h3-ascend-910b4/index.html",
    date: "2026-09-01", hardware: "8× Ascend 910B4 · 64 GB", engine: "SGLang 0.5.17 · temporary Ascend branch", precision: "BF16",
    summary: "Repeatable 50-step T2VA generation with media validation and phase-level timings.",
    highlights: [{ value: "458.4", unit: "s", label: "50-step end-to-end · run 1" }, { value: "456.5", unit: "s", label: "50-step end-to-end · run 2" }, { value: "2 / 2", unit: "runs", label: "Byte-identical output" }],
    topologyByLocale: { zh: "8 卡单机 · SP8 · Ulysses8", en: "Single 8-card node · SP8 · Ulysses8" },
    caveat: "Results require a temporary Ascend-specific branch; stock SGLang 0.5.17 did not complete the denoising path. n=2, so no percentile statistics are reported.",
  },
  {
    slug: "minimax-h3-ppu-zw810e", modelId: "MiniMax-H3", modelName: "MiniMax-H3",
    title: "Video generation on PPU ZW810E", href: "/reports/minimax-h3-ppu-zw810e/index.html",
    date: "2026-09-03", hardware: "4× PPU ZW810E · 96 GB", engine: "SGLang 0.5.18 + PPU patches", precision: "BF16",
    summary: "Ten serial T2VA and Ref2VA runs per task, with validated video outputs and phase timings.",
    highlights: [{ value: "443.20", unit: "s", label: "T2VA median · n=10" }, { value: "755.05", unit: "s", label: "Ref2VA median · n=10" }, { value: "20 / 20", unit: "outputs", label: "Media validation passed" }],
    topologyByLocale: { zh: "4 卡 · TP2 × Ulysses2", en: "4 cards · TP2 × Ulysses2" },
    caveat: "SGLang uses PPU adaptation patches. Measurements are from one startup; n=10 does not support tail-percentile claims or cross-startup reproducibility.",
  },
  {
    slug: "qwen38-flash-next-mxfp8-950dt",
    modelId: "Eco-Tech/Qwen3.8-Flash-Next-w8a8-mxfp8-mtp", modelName: "Qwen3.8-Flash-Next",
    title: "MXFP8-MTP serving on Ascend 950DT", href: "/reports/qwen38-flash-next-mxfp8-950dt/index.html",
    date: "2026-10-20", hardware: "8× Ascend 950DT · 96 GB", engine: "vLLM-Ascend 0.30.0rc2 + local adaptation", precision: "W8A8-MXFP8",
    summary: "Seventeen completed points cover fixed-length text, coding-trace replay, image-text requests, and 256K/512K context probes.",
    highlights: [{ value: "225.1", unit: "tok/s", label: "8K / 512 · C8 aggregate" }, { value: "437 / 437", unit: "turns", label: "Coding trace replay · C8" }, { value: "512K", unit: "context", label: "YaRN retrieval · 8/8" }],
    topologyByLocale: { zh: "单机 · TP8 + EP · DP1 · MTP3", en: "Single node · TP8 + EP · DP1 · MTP3" },
    caveat: "The final 8K-batched-token/QSA960 run uses local source and operator adaptations. Agent replay measures serving behavior, not coding task success. The 512K point is a low-sample retrieval probe; 1M was stopped before completion and is excluded.",
  },
  {
    slug: "qwen3-8b-bf16-ascend-910b4-engines",
    modelId: "Qwen/Qwen3-8B", modelName: "Qwen3-8B",
    title: "BF16 serving benchmark on Ascend 910B4", href: "/reports/qwen3-8b-bf16-ascend-910b4-engines/index.html",
    date: "2026-05-25", hardware: "1× / 4× Ascend 910B4 · 32 GB", engine: "vLLM-Ascend 0.18.0rc1 · MindIE 2.1 · SGLang-CANN", precision: "BF16",
    summary: "Three workload studies cover fixed-length scaling, multi-turn Agent-shaped traffic, and a 500-prompt ShareGPT replay on the same Qwen3-8B checkpoint.",
    highlights: [{ value: "1,004", unit: "tok/s", label: "Mid · C64 · single-card study" }, { value: "7 / 7", unit: "shapes", label: "vLLM led RPS in Agent-shaped matrix" }, { value: "4.52", unit: "req/s", label: "ShareGPT · C32 · TP4" }],
    topologyByLocale: { zh: "单卡合成负载 + 4 卡 TP4 对话回放", en: "Single-card synthetic matrix + 4-card TP4 trace replay" },
    caveat: "The single-card comparison has an approximately 15% KV-budget asymmetry for MindIE; small gaps inside that band are not treated as engine wins. Synthetic traffic, Agent-shaped replay, and ShareGPT are separate studies and their metrics are not pooled.",
  },
  {
    slug: "glm-5-2-w4a8-ppu-16-long-context",
    modelId: "zai-org/GLM-5.2", modelName: "GLM-5.2",
    title: "W4A8 long-context serving on 16× PPU ZW810E", href: "/reports/glm-5-2-w4a8-ppu-16-long-context/index.html",
    date: "2026-08-02", hardware: "16× PPU ZW810E · 96 GB", engine: "SGLang 0.5.12 · PPU adaptation", precision: "W4A8 · DSA",
    summary: "End-to-end prompts reach 660K tokens; the report measures cold and warm prefix-cache latency and tests the practical context ceiling.",
    highlights: [{ value: "660,016", unit: "tokens", label: "Longest successful prompt" }, { value: "524.5×", unit: "warm/cold", label: "660K prefix-cache TTFT ratio" }, { value: "26.39", unit: "ms", label: "TP16 short-context TPOT" }],
    topologyByLocale: { zh: "单机 · TP16 · 纯 TP", en: "Single node · TP16 · tensor parallel only" },
    caveat: "The 660K boundary point and context staircase use one request per length; they establish observed feasibility, not a tail-latency or production SLO. The 1M target was not reached on this hardware and software stack.",
  },
  {
    slug: "deepseek-v4-flash-int8-ppu-sglang",
    modelId: "deepseek-ai/DeepSeek-V4-Flash", modelName: "DeepSeek-V4-Flash",
    title: "INT8 serving benchmark on PPU ZW810E", href: "/reports/deepseek-v4-flash-int8-ppu-sglang/index.html",
    date: "2026-07-02", hardware: "8× PPU ZW810E · 96 GB", engine: "SGLang 0.5.12", precision: "INT8 · W8A8",
    summary: "ShareGPT load sweeps map throughput and latency through the configured concurrency cap; the 256-token output profile has three repeats per point.",
    highlights: [{ value: "568", unit: "tok/s", label: "Output 256 · C32 · median" }, { value: "32", unit: "concurrency", label: "Configured running-request cap" }, { value: "0", unit: "errors", label: "22 benchmark runs" }],
    topologyByLocale: { zh: "单机 · TP8 · Attention CP8", en: "Single node · TP8 · attention context parallel 8" },
    caveat: "C32 is also the configured max-running-requests limit, so the throughput plateau is a configuration boundary rather than proof of hardware saturation. Output-1,024 points are single-run observations; repeated statistics apply only to output-256 points.",
  },
  {
    slug: "qwen3-omni-30b-a3b-a100", modelId: "Qwen/Qwen3-Omni-30B-A3B-Instruct", modelName: "Qwen3-Omni-30B-A3B",
    title: "Real-time audio and text serving on A100", href: "/reports/qwen3-omni-30b-a3b-a100/index.html",
    date: "2026-07-15", hardware: "3× A100 · 80 GB", engine: "vLLM-Omni 0.24.0", precision: "BF16",
    summary: "Official omni-bench audio RTF, fixed-prompt audio load, text throughput, first-packet latency, and audio-output overhead.",
    highlights: [{ value: "C32", unit: "real-time", label: "Official Omni Bench · RTF 0.54" }, { value: "139.7", unit: "tok/s", label: "Text output · C16, not saturated" }, { value: "3.3", unit: "s", label: "Added text-to-audio E2E · C8" }],
    topologyByLocale: { zh: "Thinker 1 卡 · Talker / Code2Wav 各 2 副本", en: "Thinker 1 GPU · 2 Talker and 2 Code2Wav replicas" },
    listMetricByLocale: {
      en: { label: "Real-time speech concurrency · official Omni Bench", value: "C32", unit: "RTF < 1", profile: "C64 crosses to RTF 1.24" },
      zh: { label: "实时语音并发 · 官方 Omni Bench", value: "C32", unit: "RTF < 1", profile: "C64 升至 RTF 1.24" },
    },
    caveat: "Single-instance result. Official Omni Bench and the heavier fixed-prompt RTF script are separate workloads; text throughput was not saturated by the highest tested concurrency.",
  },
  {
    slug: "qwen3-omni-30b-a3b-ascend-910b3", modelId: "Qwen/Qwen3-Omni-30B-A3B-Instruct", modelName: "Qwen3-Omni-30B-A3B",
    title: "Streaming audio serving on Ascend 910B3", href: "/reports/qwen3-omni-30b-a3b-ascend-910b3/index.html",
    date: "2026-07-27", hardware: "4× Ascend 910B3 · 64 GB", engine: "vLLM-Omni 0.26.0", precision: "BF16",
    summary: "Fixed read-aloud prompt benchmark covers audio RTF, first-packet latency, and separate text-serving throughput.",
    highlights: [{ value: "4", unit: "streams", label: "All observed requests real-time · RTF max 0.951" }, { value: "894", unit: "ms", label: "Audio TTFP P50 · C8" }, { value: "36.6", unit: "tok/s", label: "Text output · C16" }],
    topologyByLocale: { zh: "Thinker TP2 · 音频阶段各 2 副本", en: "Thinker TP2 · 2 replicas per audio stage" },
    listMetricByLocale: {
      en: { label: "Fixed-prompt all-request real-time boundary", value: "C4", unit: "RTF max < 1", profile: "C8 maximum RTF 1.056" },
      zh: { label: "固定 prompt 全请求实时边界", value: "C4", unit: "RTF 最大值 < 1", profile: "C8 最大 RTF 1.056" },
    },
    caveat: "The real-time boundary depends on prompt length and collection method. These fixed-prompt results are not interchangeable with the separate Seed-TTS or official Omni Bench profiles.",
  },
  {
    slug: "qwen3-32b-pd-disaggregation-a100", modelId: "Qwen/Qwen3-32B", modelName: "Qwen3-32B",
    title: "PD disaggregation on A100 · SLO goodput", href: "/reports/qwen3-32b-pd-disaggregation-a100/index.html",
    date: "2026-07-18", hardware: "8× A100 · 80 GB", engine: "vLLM 0.20.0 V1 · NIXL Connector", precision: "BF16",
    summary: "Three-run per-request SLO pass-rate matrix compares four TP2 replicas with a fixed 2P2D Prefill/Decode layout.",
    highlights: [{ value: "C128–160", unit: "crossover", label: "Discrete measured interval" }, { value: "70%", unit: "SLO pass", label: "PD at C160 · aggregate 32%" }, { value: "69%", unit: "SLO pass", label: "PD at C192 · aggregate 1%" }],
    topologyByLocale: { zh: "4 个 TP2 聚合副本 vs 2P2D · TP2", en: "4 aggregated TP2 replicas vs 2P2D · TP2" },
    listMetricByLocale: {
      en: { label: "Dual-gate SLO pass rate · PD · C160", value: "70%", unit: "TTFT ≤16 s · TPOT ≤60 ms", profile: "Aggregation: 32%" },
      zh: { label: "双门 SLO 达标率 · PD · C160", value: "70%", unit: "TTFT ≤16 s · TPOT ≤60 ms", profile: "聚合：32%" },
    },
    caveat: "The crossover is inferred between C128 and C160. This is an SLO-goodput result, not a raw-throughput advantage; conclusions are tied to the tested request profile and SLO.",
  },
  {
    slug: "qwen3-32b-shared-kv-cache-a100", modelId: "Qwen/Qwen3-32B", modelName: "Qwen3-32B",
    title: "Shared KV cache pool on A100", href: "/reports/qwen3-32b-shared-kv-cache-a100/index.html",
    date: "2026-07-21", hardware: "8× A100 · 80 GB · RDMA", engine: "vLLM 0.20.0 · LMCache 0.4.4 · Mooncake Store", precision: "BF16",
    summary: "Real multi-turn long-context traffic tests cross-replica cache reuse across four TP2 replicas and its effect on SLO goodput.",
    highlights: [{ value: "3.37×", unit: "TTFT improvement", label: "P50 · C10" }, { value: "2.44×", unit: "goodput improvement", label: "C10 · 0.36 → 0.88 req/s" }, { value: "33%", unit: "external hits", label: "Added by shared pool" }],
    topologyByLocale: { zh: "4 个 TP2 副本 · 280 GB DRAM 共享池", en: "4 TP2 replicas · 280 GB shared DRAM pool" },
    listMetricByLocale: {
      en: { label: "SLO goodput · pool on · C10", value: "0.88", unit: "req/s", profile: "Pool off: 0.36 req/s" },
      zh: { label: "SLO goodput · 开池 · C10", value: "0.88", unit: "req/s", profile: "关闭：0.36 req/s" },
    },
    caveat: "The gain requires a working set larger than local GPU cache, a pool large enough to hold it, and routing that creates cross-replica misses. At C30, decode TPOT remains above the SLO.",
  },
  {
    slug: "deepseek-v4-flash-int8-ppu-tuning", modelId: "deepseek-ai/DeepSeek-V4-Flash", modelName: "DeepSeek-V4-Flash",
    title: "INT8 serving configuration sweep on PPU", href: "/reports/deepseek-v4-flash-int8-ppu-tuning/index.html",
    date: "2026-07-12", hardware: "8× PPU ZW810E · 96 GB", engine: "SGLang 0.5.12 · TP8 · EAGLE", precision: "INT8 · W8A8",
    summary: "MRR and CUDA Graph batch settings are swept for Chat, followed by a real long-input Agent trace on one instance.",
    highlights: [{ value: "823", unit: "tok/s", label: "MRR96 peak · single run" }, { value: "100%", unit: "KV", label: "MRR128 · only ~2% more throughput" }, { value: "0.57–1.65", unit: "req/s", label: "Agent achieved · offered 3.9 req/s" }],
    topologyByLocale: { zh: "单机 · TP8 · SGLang", en: "Single node · TP8 · SGLang" },
    listMetricByLocale: {
      en: { label: "Observed Chat peak · MRR96", value: "823", unit: "tok/s", profile: "Single run · peak KV 78%" },
      zh: { label: "Chat 观测峰值 · MRR96", value: "823", unit: "tok/s", profile: "单次运行 · KV 峰值 78%" },
    },
    caveat: "MRR96 and Agent points are single-run observations. MRR and cuda-graph-bs changed together; the Agent trace is a different workload from Chat.",
  },

];

const REPORT_CONCLUSIONS = {
  "glm-5-3-flash-rtx-pro-5000": {
    en: "At 8K input / 2,048 output, aggregate throughput reaches 895.3 tok/s at C16; the report separately measures Agent replay, open-loop arrivals, and a two-hour soak.",
    zh: "8K 输入、2,048 输出时，C16 总吞吐达到 895.3 tok/s；Agent 回放、开放环请求和两小时稳定性测试分别统计。",
  },
  "qwen38-flash-next-rtx-pro-5000-fp8": {
    en: "For 8K / 512, output throughput rises from 150.8 tok/s at C1 to 529.7 tok/s at C16. TTFT is reported for C1/C2 only, so the higher-concurrency latency trend is not established.",
    zh: "8K / 512 下，输出吞吐从 C1 的 150.8 升至 C16 的 529.7 tok/s。TTFT 只测了 C1/C2，不能据此判断更高并发的首 token 延迟。",
  },
  "qwen38-flash-next-rtx-pro-5000-nvfp4": {
    en: "For 8K / 512, output throughput rises from 176.0 tok/s at C1 to 576.6 tok/s at C16. The long-context points are separate workloads and should be read with their prompt lengths.",
    zh: "8K / 512 下，输出吞吐从 C1 的 176.0 升至 C16 的 576.6 tok/s。长上下文数据属于不同负载，应结合各自输入长度解读。",
  },
  "qwen38-27b-mxfp8-950dt": {
    en: "Across eight independent TP1 instances, 8K / 512 aggregate throughput rises from 49.7 tok/s at C4 to 245.4 tok/s at C32. No C1 point was measured, and co-run load varied.",
    zh: "8 个独立 TP1 实例的 8K / 512 总吞吐从 C4 的 49.7 升至 C32 的 245.4 tok/s；未测 C1，且测试期间共跑负载有变化。",
  },
  "qwen38-27b-rtx-pro-5000-nvfp4": {
    en: "On the 8K / 256 matrix, aggregate throughput reaches 188.3 tok/s at C16, up from 60.1 at C1; median TTFT also rises from 1.05 s to 2.70 s.",
    zh: "8K / 256 矩阵中，C16 总吞吐达到 188.3 tok/s，高于 C1 的 60.1；中位 TTFT 也从 1.05 秒升至 2.70 秒。",
  },
  "qwen38-27b-rtx-pro-5000-fp8": {
    en: "On the 8K / 256 matrix, aggregate throughput reaches 154.1 tok/s at C16; median TTFT at that point is 3.29 s. Long-context results are measured separately at C1.",
    zh: "8K / 256 矩阵中，C16 总吞吐达到 154.1 tok/s，对应中位 TTFT 为 3.29 秒；长上下文结果是在 C1 下单独测得。",
  },
  "qwen38-27b-rtx-pro-5000-bf16": {
    en: "On the 8K / 256 matrix, throughput peaks at 81.0 tok/s at C8, then slips to 77.3 at C16; C16 median TTFT reaches 32.7 s.",
    zh: "8K / 256 矩阵的吞吐在 C8 达到 81.0 tok/s，C16 回落至 77.3；C16 中位 TTFT 达到 32.7 秒。",
  },
  "qwen36-27b-w8a8-ascend-910b4": {
    en: "The 250K-input TP4×2 run launched two requests at the point labeled C1: aggregate throughput was 2,454 tok/s, rising to 4,908 at C2 before falling at C4. This is not a single-request C1 result.",
    zh: "250K 输入的 TP4×2 测试中，标为 C1 的点实际启动了两个请求，总吞吐为 2,454 tok/s；C2 升至 4,908，C4 则回落。这不是单请求 C1 结果。",
  },
  "glm-5-2-w4a8-ppu-sglang": {
    en: "For 256-token outputs, the TP8 baseline reaches 368.9 tok/s at C32. The added DP-attention sweep shows MRR32 near that throughput at C32, then rising queue latency at higher concurrency; neither peak is a general concurrency recommendation.",
    zh: "输出长度为 256 时，TP8 基线在 C32 达到 368.9 tok/s。补充的 DP Attention 扫描显示，MRR32 在 C32 吞吐接近基线，但更高并发下排队延迟明显增加；两者都不代表通用并发建议。",
  },
  "deepseek-v41-flash-mi308x": {
    en: "Measured TP4 output throughput is 52.3 tok/s for 128/128, 428.4 for 128/2,048, and 458.5 for 512/256. The same-weight TP8 topology sweep raises six workload throughputs by 11–26% using the same eight GPUs; at 256K input, median TTFT reaches 156.6 s.",
    zh: "TP4 实测输出吞吐分别为：128 / 128 的 52.3 tok/s、128 / 2,048 的 428.4 tok/s、512 / 256 的 458.5 tok/s。同权重 TP8 拓扑使用同样 8 张 GPU，在六类负载上的吞吐高 11%–26%；输入达到 256K 时，中位 TTFT 为 156.6 秒。",
  },
  "glm-5-3-flash-fp8-mi308x": {
    en: "For 512 / 256 open-loop traffic, aggregate output throughput reaches 2,225.4 tok/s at a 12.2 req/s arrival rate. The original serving path crashed at 2.1K input, so no longer-context result is available.",
    zh: "512 / 256 开放环负载在 12.2 req/s 到达率下，总输出吞吐达到 2,225.4 tok/s。原始服务路径在 2.1K 输入处崩溃，因此没有更长上下文的结果。",
  },
  "glm-5-3-flash-w8a8-mxfp8-950dt": {
    en: "The 16-session Agent replay reaches 173.9 tok/s at C8, versus 72.7 at C1. For a 256K hot prefix, TTFT P95 grows from 802 ms at C1 to 4.97 s at C8; 1M retrieval checks passed 8/8.",
    zh: "16 会话 Agent 回放的总吞吐从 C1 的 72.7 升至 C8 的 173.9 tok/s。256K 热前缀下，TTFT P95 从 C1 的 802 ms 升至 C8 的 4.97 秒；1M 检索校验通过 8/8。",
  },
  "minimax-h3-rtx-pro-6000": {
    en: "After resolving the PCIe communication bottleneck, SGLang renders a 5-second 1344×768 T2VA clip in 175.6 s on four GPUs, versus 295.6 s on two; eight GPUs reduce it further to 120.1 s, with weaker scaling efficiency.",
    zh: "修复 PCIe 通信瓶颈后，SGLang 在 4 卡上以 175.6 秒生成 5 秒、1344×768 的 T2VA 视频；2 卡需 295.6 秒，扩至 8 卡降至 120.1 秒，但扩展效率变弱。",
  },
  "qwen3-32b-sharegpt-ascend-910b4": {
    en: "On the ShareGPT trace, vLLM-Ascend reaches 1,228 tok/s at C128 with a 1.2 s median TTFT. SGLang throughput drops at C128 after increasing through C64; each point summarizes three runs.",
    zh: "ShareGPT 轨迹下，vLLM-Ascend 在 C128 达到 1,228 tok/s，中位 TTFT 为 1.2 秒。SGLang 吞吐在升至 C64 后于 C128 回落；各点为三轮测试汇总。",
  },
  "minimax-m27-w8a8-910b4": {
    en: "For 512 / 256 Poisson arrivals, the preregistered repeatable SLO boundary is 2.25 req/s per replica. The separate Agent replay completed all 235 requests; its TTFT P95 varied noticeably between reruns.",
    zh: "512 / 256 Poisson 到达负载下，预先设定并重复验证的 SLO 边界为每个副本 2.25 req/s。Agent 回放的 235 个请求全部完成，但 TTFT P95 在重跑间波动明显。",
  },
  "qwen36-27b-w8a8-mtp-tpdp-910b4": {
    en: "In the clean same-session retest, MTP k=3 raises output throughput from 20.4 to 33.2 tok/s at C1 (+63%), but falls to 467.4 versus 565.0 tok/s at C64 (−17%). TP4×2 leads the separate topology phase at 713 tok/s; TP8×1 has the lowest single-user TPOT.",
    zh: "同一轮干净复测中，MTP k=3 在 C1 将输出吞吐从 20.4 提高到 33.2 tok/s（+63%）；C64 则为 467.4，低于关闭 MTP 时的 565.0 tok/s（−17%）。独立的拓扑测试阶段中 TP4×2 总吞吐最高，为 713 tok/s；TP8×1 单用户 TPOT 最低。",
  },
  "qwen3-omni-30b-a3b-a100": {
    en: "Official omni-bench audio remains real-time through C32 (RTF 0.54); C64 crosses the limit at 1.24. Text throughput reaches 139.7 tok/s at C16, where the tested matrix has not saturated.",
    zh: "官方 omni bench 的音频负载在 C32 仍满足实时条件（RTF 0.54），C64 升至 1.24 越线。文本吞吐在 C16 达 139.7 tok/s，测试矩阵尚未饱和。",
  },
  "qwen3-omni-30b-a3b-ascend-910b3": {
    en: "With the fixed ~6-second audio prompt, C4 is the highest point where all observed requests stay real-time (maximum RTF 0.951); C8 reaches 1.056. Text output throughput reaches 36.6 tok/s at C16.",
    zh: "固定约 6 秒语音 prompt 下，C4 是所有观测请求均实时的最高测点（最大 RTF 0.951）；C8 升至 1.056。文本输出吞吐在 C16 达 36.6 tok/s。",
  },
  "qwen3-32b-pd-disaggregation-a100": {
    en: "Under the tested dual-gate SLO, aggregated replicas lead through C128; PD disaggregation reaches 70% pass rate at C160 versus 32% for aggregation. The crossover lies between measured points.",
    zh: "在本次双门 SLO 下，多副本聚合到 C128 仍领先；C160 时 PD 分离达标率为 70%，聚合为 32%。交叉区间位于两个实测档之间。",
  },
  "qwen3-32b-shared-kv-cache-a100": {
    en: "With a 280 GB shared pool covering the long-context working set, C10 TTFT median falls 3.37× and SLO goodput rises 2.44×. Gains depend on cross-replica cache misses.",
    zh: "280 GB 共享池覆盖长上下文工作集后，C10 中位 TTFT 降低 3.37×，SLO goodput 提高 2.44×；收益依赖跨副本缓存缺失。",
  },
  "deepseek-v4-flash-int8-ppu-tuning": {
    en: "MRR96 reaches an observed 823 tok/s peak, but low-load throughput falls versus MRR32 and MRR128 peaks KV usage at 100%. A single instance also falls short of the long-input Agent arrival rate.",
    zh: "MRR96 观测峰值为 823 tok/s，但低并发吞吐低于 MRR32；MRR128 的 KV 峰值达到 100%。单实例也无法跟上长输入 Agent 的目标到达率。",
  },
};

const TEST_IDS = {
  fixed: "fixed",
  capacity: "fixed",
  "capacity-slo": "openLoop",
  "output-shape": "fixed",
  graph: "fixed",
  arrival: "openLoop",
  interpretation: "openLoop",
  "reasoning-effort": "quality",
  decode: "longContext",
  tradeoff: "fixed",
  "short-input": "fixed",
  "long-output": "fixed",
  concurrency: "fixed",
  configuration: "fixed",
  latency: "fixed",
  openloop: "openLoop",
  compatibility: "longContext",
  serving: "fixed",
  agent: "agent",
  replay: "agent",
  "agent-replay": "agent",
  openloop: "openLoop",
  "open-loop": "openLoop",
  stability: "stability",
  soak: "stability",
  longcontext: "longContext",
  "long-context": "longContext",
  sharegpt: "sharegpt",
  vision: "vision",
  quality: "quality",
  videoGeneration: "videoGeneration",
  generation: "videoGeneration",
  breakdown: "videoGeneration",
};

function readReportData(slug) {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "public/reports/data", `${slug}.json`), "utf8"));
  } catch {
    return null;
  }
}

function numberFrom(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^(?:—|–|-|n\/?a)$/i.test(trimmed)) return null;
  const match = trimmed.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0].replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function latencyUnit(value, header) {
  const cellMatch = String(value ?? "").match(/(?:^|\s)(milliseconds?|ms|seconds?|secs?|s)\s*$/i);
  const text = cellMatch?.[1] || String(header ?? "");
  if (/\bms\b|milliseconds?|毫秒/i.test(text)) return "ms";
  if (/\b(?:s|sec|secs|second|seconds)\b|秒/i.test(text)) return "s";
  return null;
}

function reportTests(data, fallback) {
  if (!data?.sections?.length) {
    const text = fallback.toLowerCase();
    return [
      text.includes("fixed") || text.includes("capacity") ? "fixed" : null,
      text.includes("agent") || text.includes("replay") ? "agent" : null,
      text.includes("open-loop") || text.includes("open loop") ? "openLoop" : null,
      text.includes("stability") || text.includes("soak") ? "stability" : null,
      text.includes("long-context") || text.includes("long context") ? "longContext" : null,
      text.includes("video") || text.includes("视频") ? "videoGeneration" : null,
    ].filter(Boolean);
  }
  return [...new Set(data.sections.map((section) => TEST_IDS[section.id] || section.id))];
}

function reportCurve(data, locale, slug) {
  if (!data && slug === "glm-5-3-flash-rtx-pro-5000") {
    // Kept for the original GLM report, whose interactive payload predates the
    // structured report JSON files.
    return {
      title: locale === "zh" ? "开放环首 token 延迟" : "Open-loop time to first token",
      series: "TTFT P50",
      labels: locale === "zh" ? ["0.25 请求/秒", "0.50 请求/秒", "1.00 请求/秒"] : ["0.25 req/s", "0.50 req/s", "1.00 req/s"],
      values: [0.406, 0.466, 2.314],
      unit: "s",
    };
  }
  for (const block of data?.blocks || []) {
    const chart = block.chart;
    if (!chart || chart.type === "bar") continue;
    const latencyPattern = /TTFT|time to first token|首 ?token|首字延迟/i;
    const axisTitle = `${chart.yTitle?.en || ""} ${chart.yTitle?.zh || ""}`;
    const axisIsTtft = latencyPattern.test(axisTitle);
    // A chart title can mention several metrics at once (for example, TTFT
    // and achieved request rate). Prefer the plotted axis or series name so
    // we never present a request-rate curve as a TTFT trend.
    const candidates = (chart.series || []).filter((item) => {
      const seriesName = `${item.en || ""} ${item.zh || ""}`;
      return item.values?.filter(Number.isFinite).length >= 2
        && (axisIsTtft || latencyPattern.test(seriesName));
    });
    if (!candidates.length) continue;
    const series = [...candidates].sort((a, b) => {
      const rank = (item) => /p50|中位/i.test(`${item.en || ""} ${item.zh || ""}`) ? 0 : /p95/i.test(`${item.en || ""} ${item.zh || ""}`) ? 1 : 2;
      return rank(a) - rank(b);
    })[0];
    const values = series.values.map((value) => typeof value === "number" && Number.isFinite(value) ? value : null);
    const unit = /\bms\b|毫秒/i.test(`${chart.yTitle?.en || ""} ${chart.yTitle?.zh || ""}`) ? "ms" : "s";
    const seriesLabel = (series[locale] || series.en || "").replace(/^TTFT\s*/i, "");
    const chartTitle = chart.title?.[locale] || chart.title?.en || block.heading?.[locale] || block.heading?.en || (locale === "zh" ? "首 token 延迟" : "Time to first token");
    return {
      title: [seriesLabel, chartTitle].filter(Boolean).join(" · "),
      series: series[locale] || series.en || "",
      labels: chart.labels?.[locale] || chart.labels?.en || values.map((_, index) => String(index + 1)),
      values,
      unit,
    };
  }

  // Many reports keep latency percentiles in the result table rather than a
  // separate chart. Build a small profile curve from those measured TTFT cells.
  for (const block of data?.blocks || []) {
    const table = block.table;
    const headers = table?.headers?.[locale] || table?.headers?.en || [];
    const ttftIndex = headers.findIndex((header) => /TTFT.*(?:P50|median|mean|中位)/i.test(header));
    if (ttftIndex < 0) continue;
    const concurrencyIndex = headers.findIndex((header, index) => index !== ttftIndex && /concurrency|并发/i.test(header));
    const contextIndex = headers.findIndex((header, index) => index !== ttftIndex && index !== concurrencyIndex && /context|input length|input \/ output|workload|profile|scenario|configuration|engine|上下文|输入长度|场景|负载|配置|引擎/i.test(header));
    const labelIndex = concurrencyIndex >= 0 ? concurrencyIndex : contextIndex;
    if (labelIndex < 0) continue;
    const header = headers[ttftIndex];
    const groups = new Map();
    for (const row of table.rows || []) {
      const groupLabel = contextIndex >= 0 && concurrencyIndex >= 0 ? String(row[contextIndex] ?? "").trim() : "";
      const key = groupLabel || "__all__";
      if (!groups.has(key)) groups.set(key, []);
      const rawValue = row[ttftIndex];
      groups.get(key).push({ label: String(row[labelIndex] ?? "").trim(), value: numberFrom(rawValue), unit: latencyUnit(rawValue, header) });
    }
    const [groupLabel, candidates] = [...groups.entries()].sort((a, b) => b[1].filter((point) => point.label && point.value !== null).length - a[1].filter((point) => point.label && point.value !== null).length)[0] || [];
    const points = (candidates || []).filter((point) => point.label && point.value !== null);
    if (points.length < 2) continue;
    const sourceUnits = [...new Set(points.map((point) => point.unit).filter(Boolean))];
    const unit = sourceUnits.includes("ms") ? "ms" : sourceUnits.includes("s") ? "s" : latencyUnit("", header) || "s";
    const context = groupLabel && groupLabel !== "__all__" ? ` · ${groupLabel}` : "";
    const engines = header.match(/(?:vLLM|MindIE|SGLang)(?:\s*\/\s*(?:vLLM|MindIE|SGLang))+/i)?.[0];
    const displayHeader = engines ? header.replace(engines, engines.split("/")[0].trim()) : header;
    return {
      title: [displayHeader, block.heading?.[locale] || block.heading?.en || (locale === "zh" ? "首 token 延迟" : "Time to first token")].filter(Boolean).join(" · ") + context,
      series: header,
      labels: points.map((point) => point.label),
      values: points.map((point) => point.unit && point.unit !== unit
        ? point.unit === "s" ? point.value * 1000 : point.value / 1000
        : point.value),
      unit,
    };
  }
  return null;
}

function reportTopology(data, report) {
  const chips = data?.chips || [];
  const candidates = chips.slice(1).filter((chip) => /\bTP\d|\bEP\b|\bDP\b|independent|per engine|instance|pipeline/i.test(chip));
  return candidates.join(" · ") || report.topology || "";
}

function reportBenchmarks(data, report) {
  const values = {};
  for (const block of data?.blocks || []) {
    const table = block.table;
    if (!table?.rows?.length) continue;
    const headers = table.headers?.en || table.headers?.zh || [];
    const outputIndex = headers.findIndex((header) => /output.*tok\/s|tok\/s.*output|output throughput|throughput.*output|输出.*tok\/s|输出吞吐/i.test(header));
    if (outputIndex < 0) continue;
    for (const row of table.rows) {
      const text = row.join(" ");
      const concurrencyIndex = row.findIndex((cell) => /^C\d+$/i.test(String(cell).trim()));
      const concurrency = concurrencyIndex >= 0 ? String(row[concurrencyIndex]).toUpperCase() : "";
      const profileText = `${text} ${block.chart?.title?.en || ""} ${block.chart?.title?.zh || ""}`;
      const throughput = numberFrom(row[outputIndex]);
      if (!throughput || !concurrency) continue;
      if (/32\s*K|32K|32,?768/i.test(profileText) && /512/.test(profileText) && concurrency === "C1") values["32k-512-c1"] = throughput;
      if (/8\s*K|8K|8192/i.test(profileText) && /256/.test(profileText) && concurrency === "C16") values["8k-256-c16"] = throughput;
    }
  }
  // GLM report predates the structured JSON payload; this is its reported fixed point.
  if (report.slug === "glm-5-3-flash-rtx-pro-5000") values["8k-2048-c16"] = 895.3;
  return values;
}

function reportSingleStream(data, locale, report) {
  if (report.slug === "glm-5-3-flash-rtx-pro-5000") {
    return { value: 181.52, unit: "tok/s", profile: locale === "zh" ? "8K 输入 / 2,048 输出 · C1" : "8K input / 2,048 output · C1" };
  }

  for (const block of data?.blocks || []) {
    const chart = block.chart;
    if (!chart) continue;
    const metric = `${chart.yTitle?.en || ""} ${chart.yTitle?.zh || ""} ${chart.title?.en || ""} ${chart.title?.zh || ""}`;
    if (!/tok\/s|throughput|吞吐/i.test(metric)) continue;
    const scenario = `${block.heading?.en || ""} ${block.intro?.en || ""} ${chart.title?.en || ""} ${chart.title?.zh || ""}`;
    if (/agent|replay|sharegpt|open.?loop|开放环/i.test(scenario)) continue;

    const labels = chart.labels?.[locale] || chart.labels?.en || [];
    // Accept only an explicitly labeled C1/single-request point. Do not infer
    // concurrency from the position of a point in a chart.
    const index = labels.findIndex((label) => /^\s*C1\s*$/i.test(String(label)) || /^\s*single(?:\s|$)/i.test(String(label)));
    if (index < 0) continue;

    // This report explicitly ran two requests at C1 across a TP4×2 layout,
    // so its displayed aggregate rate is not one global request stream.
    if (report.slug === "qwen36-27b-w8a8-ascend-910b4") continue;
    const series = chart.series?.find((candidate) => Number.isFinite(candidate.values?.[index]));
    if (!series) continue;

    const point = String(labels[index]);
    const context = chart.title?.[locale] || chart.title?.en || block.heading?.[locale] || block.heading?.en || "";
    return {
      value: series.values[index],
      unit: "tok/s",
      profile: [context, point].filter(Boolean).join(" · "),
    };
  }
  return null;
}

function enrichReport(report, locale = "en") {
  const data = readReportData(report.slug);
  const firstHardwareChip = data?.chips?.[0] || report.hardware;
  const hardwareName = firstHardwareChip.replace(/^\s*\d+\s*[×x]\s*/i, "").split(" · ")[0];
  const family = /RTX|NVIDIA/i.test(hardwareName) ? "nvidia" : /MI\d|AMD/i.test(hardwareName) ? "amd" : /Ascend/i.test(hardwareName) ? "ascend" : /PPU/i.test(hardwareName) ? "ppu" : "other";
  const tests = reportTests(data, `${report.summary} ${report.title}`).filter((id) => id !== "method");
  return {
    ...report,
    hardwareName,
    hardwareFamily: family,
    topology: report.topologyByLocale?.[locale] || reportTopology(data, report) || report.topology || "",
    testIds: tests,
    testLabels: tests.map((id) => {
      const section = data?.sections?.find((item) => item.id === id || TEST_IDS[item.id] === id);
      return section?.[locale] || section?.en || id;
    }),
    summary: REPORT_CONCLUSIONS[report.slug]?.[locale] || data?.lede?.[locale] || report.summary,
    curve: report.curveByLocale?.[locale] || reportCurve(data, locale, report.slug),
    listMetric: report.listMetricByLocale?.[locale] || null,
    benchmarks: reportBenchmarks(data, report),
    singleStream: reportSingleStream(data, locale, report),
  };
}

export function getPerformanceReports(locale = "en") {
  return REPORTS.map((report) => enrichReport(report, locale));
}

export function getPerformanceReportsForModel(modelId, locale = "en") {
  return getPerformanceReports(locale).filter((report) => report.modelId === modelId);
}
