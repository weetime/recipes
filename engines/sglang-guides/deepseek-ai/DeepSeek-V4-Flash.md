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
