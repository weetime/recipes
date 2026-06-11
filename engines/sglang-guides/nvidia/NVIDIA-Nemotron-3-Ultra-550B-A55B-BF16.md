## Overview

NVIDIA Nemotron-3-Ultra-550B-A55B is a hybrid Transformer-Mamba Mixture-of-Experts
reasoning model — 550B total parameters with 55B active per token — built for
long-context (256K) agentic reasoning, coding, and tool use. This guide covers
serving the native **BF16** checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).
- This is a very large BF16 model (~1.2 TB of weights): plan for a full 8×B200
  node, and expect SGLang to derive a multi-node tensor-parallel layout from
  `tp 8` when serving across nodes.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16 \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen3_coder --reasoning-parser nemotron_3
```

## Launching the server

The BF16 checkpoint (~1.2 TB) is served at `tp 8`. A single 8×B200 node is the
verified configuration; multi-node tensor parallelism is derived at render time.

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser nemotron_3
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder` — the model uses the
  Qwen3-Coder tool-call protocol.
- **Reasoning (thinking mode):** `--reasoning-parser nemotron_3` — note SGLang's
  parser id is `nemotron_3`, distinct from vLLM's `nemotron_v3`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16)
- [SGLang docs](https://docs.sglang.ai)
