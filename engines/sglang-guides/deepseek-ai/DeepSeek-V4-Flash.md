## Overview

DeepSeek-V4-Flash is the compact 284B-total / 13B-active member of the DeepSeek-V4
preview family. It pairs a hybrid attention stack — Compressed Sparse Attention
(CSA) + Heavily Compressed Attention (HCA) — with Manifold-Constrained
Hyper-Connections (mHC), ships an FP4+FP8 mixed checkpoint (MoE experts in FP4,
the rest in FP8), and supports up to 1M-token context with Multi-Token Prediction.
This guide covers serving it with **SGLang**, wiring its three-tier reasoning
(Non-think / Think High / Think Max) and tool calling.

## Prerequisites

- **SGLang:** 0.5.10 or newer. DeepSeek-V4 support is recent — at launch it lands
  via SGLang **nightly** builds, and Blackwell (B200) kernel support arrives through
  in-flight PRs. Prefer a nightly Docker image or `main`-branch build if a stable
  0.5.10 wheel does not yet recognize the architecture.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang nightly Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:dev \
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V4-Flash \
  --trust-remote-code --tp 4 \
  --tool-call-parser deepseekv4 --reasoning-parser deepseek-v4
```

## Launching the server

The FP4+FP8 mixed checkpoint fits comfortably at `tp 4` on H200 or B200.

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V4-Flash \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser deepseekv4 \
  --reasoning-parser deepseek-v4
```

## PPU-ZW810E (T-Head 真武, INT8) — tested

Verified end-to-end on **Alibaba T-Head PPU-ZW810E ×8** (single node) with
**SGLang 0.5.12** serving the **`DeepSeek-V4-Flash-INT8`** checkpoint
(`w8a8_int8`, not the FP4+FP8 default). This is a domestic-accelerator INT8 path
distinct from the H200/B200 launch above — it runs `--tp 8`, NSA prefill
context-parallel, DeepEP all-to-all MoE, and EAGLE speculative decoding.

Launch command (taken from the running service):

```bash
python3 -m sglang.launch_server \
  --model-path /model/DeepSeek-V4-Flash-INT8 --trust-remote-code \
  --served-model-name DeepSeek-V4-Flash-INT8 \
  --port 8000 --enable-metrics \
  --tp 8 --context-length 8192 --quantization w8a8_int8 \
  --attention-context-parallel-size 8 --enable-nsa-prefill-context-parallel \
  --moe-a2a-backend deepep --disable-shared-experts-fusion \
  --max-running-requests 32 --cuda-graph-bs 32 \
  --mem-fraction-static 0.75 --chunked-prefill-size 8192 \
  --kv-cache-dtype bfloat16 --disable-piecewise-cuda-graph \
  --tool-call-parser deepseekv4 --reasoning-parser deepseek-v4 \
  --speculative-algo EAGLE --speculative-num-steps 2 \
  --speculative-eagle-topk 1 --speculative-num-draft-tokens 2
```

Required environment variables (PPU / SGLang tuning knobs):

```bash
export GPU_COUNT=8
export NODE_COUNT=1
export PORT=8000
export SGLANG_OPT_USE_MULTI_STREAM_OVERLAP=1
export SGLANG_DEEPEP_NUM_MAX_DISPATCH_TOKENS_PER_RANK=512
export SGLANG_OPT_USE_COMPRESSOR_V2=0
export SGLANG_OPT_FUSE_WQA_WKV=0
export SGLANG_DSV4_FP4_EXPERTS=0
export SGLANG_OPT_USE_FUSED_STORE_CACHE=0
```

Notes:

- **Checkpoint:** `DeepSeek-V4-Flash-INT8` (`w8a8_int8`) — a separate INT8 quant of
  the model, not the FP4+FP8 mixed default. KV cache runs `bfloat16` here, not fp8.
- **Concurrency knee = config, not hardware.** `--max-running-requests 32` +
  `--cuda-graph-bs 32` cap in-flight requests at 32; peak output throughput
  **568 tok/s at concurrency 32**, and throughput stops growing past 32 (requests
  queue). To go higher, raise both values (and `--mem-fraction-static`) before
  adding concurrency, or scale replicas horizontally.
- **Measured (ShareGPT, hot/steady-state):** TTFT p50 < 0.57 s within the knee,
  100% success across the sweep. Context length was capped at 8192 for the sweep.
- **Container image:** `sail:1.10.10-poc-…-sglang0.5.12-vllm0.20.1-py312`.

### Benchmark

Measured on **PPU-ZW810E ×8 · SGLang 0.5.12**, ShareGPT (`share_gpt_en`),
`seed=42`, `temperature=0`. Peak output throughput **568 tok/s at concurrency 32**
(= `--max-running-requests 32`); every point returned 100% success. Latencies in
ms unless noted; E2E in seconds. ★ = throughput knee.

**Output = 256 tokens**

| Concurrency | Success | RPS | Output tok/s | TTFT p50 | TTFT p99 | TPOT p50 | ITL p50 | E2E p50 (s) | E2E p99 (s) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 100% | 0.15 | 39 | 376 | 7379 | 21.1 | 43.7 | 6.13 | 12.79 |
| 4 | 100% | 0.48 | 121 | 381 | 6389 | 26.6 | 48.5 | 7.54 | 13.19 |
| 8 | 100% | 0.94 | 230 | 408 | 2406 | 31.3 | 52.5 | 8.42 | 10.68 |
| 16 | 100% | 1.57 | 379 | 519 | 2643 | 38.7 | 59.5 | 10.30 | 13.12 |
| **32 ★** | 100% | **2.34** | **568** | 547 | 2524 | 51.4 | 72.6 | 13.64 | 17.93 |
| 64 | 100% | 2.28 | 556 | 14578 | 16367 | 56.2 | 73.0 | 28.38 | 32.73 |
| 128 | 100% | 2.25 | 549 | 43264 | 45565 | 57.3 | 73.9 | 57.10 | 61.36 |
| 256 | 100% | 2.19 | 536 | 100679 | 105809 | 57.6 | 74.3 | 114.56 | 121.60 |

**Output = 1024 tokens**

| Concurrency | Success | RPS | Output tok/s | TTFT p50 | TTFT p99 | TPOT p50 | ITL p50 | E2E p50 (s) | E2E p99 (s) |
|---|---|---|---|---|---|---|---|---|---|
| 4 | 100% | 0.20 | 151 | 456 | 711 | 24.5 | 48.0 | 20.44 | 28.57 |
| 8 | 100% | 0.33 | 253 | 441 | 1523 | 26.2 | 52.6 | 23.56 | 31.74 |
| 16 | 100% | 0.58 | 429 | 544 | 1564 | 31.4 | 58.1 | 26.33 | 37.55 |
| 32 | 100% | 0.89 | 638 | 810 | 1504 | 37.4 | 65.0 | 29.02 | 45.59 |

Past the concurrency-32 knee, throughput flattens (556 → 536 tok/s) while TTFT
climbs sharply (14.6 s → 100.7 s at c256) — requests queue rather than run. For
more throughput, raise `--max-running-requests` / `--cuda-graph-bs` (and
`--mem-fraction-static`) or scale replicas, rather than adding concurrency.

## Features

- **Tool calling:** `--tool-call-parser deepseekv4`
- **Reasoning (thinking mode):** `--reasoning-parser deepseek-v4`. The chat template
  exposes three reasoning-effort modes (Non-think / Think High / Think Max) selected
  per request via `chat_template_kwargs`. Think Max needs a large `--max-model-len`
  (≥384K) to avoid truncation. Recommended sampling: `temperature=1.0`, `top_p=1.0`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-V4-Flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash)
- [SGLang DeepSeek usage docs](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md)
- [SGLang docs](https://docs.sglang.ai)
