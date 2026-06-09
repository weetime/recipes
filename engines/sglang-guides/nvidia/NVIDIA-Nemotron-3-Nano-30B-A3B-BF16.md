## Overview

NVIDIA Nemotron-3-Nano-30B-A3B is a hybrid-Mamba MoE model (30B total parameters,
~3B active per token) from NVIDIA. This guide covers serving the BF16 checkpoint with
**SGLang**. The model fits on a single GPU at TP 1, making it practical for workstations
and smaller servers.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 \
  --trust-remote-code --tp 1 \
  --tool-call-parser qwen3_coder --reasoning-parser nano_v3
```

## Launching the server

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser nano_v3
```

`--tp 1` is correct for H200 and B200. The model's ~3B active parameter count means
a single high-VRAM GPU carries the full workload without tensor parallelism.

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning:** `--reasoning-parser nano_v3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16)
- [SGLang docs](https://docs.sglang.ai)
