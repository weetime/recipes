## Overview

NVIDIA Nemotron-3-Super-120B-A12B is a hybrid-Mamba latent-MoE model (~120B total
parameters, ~12B active per token) from NVIDIA. This guide covers serving the BF16
checkpoint with **SGLang**. With TP 4 across H200 or B200 GPUs it fits on a single
node and delivers strong throughput for reasoning and agentic workloads.

## Prerequisites

- **SGLang:** 0.5.8 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.8"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16 \
  --trust-remote-code --tp 4 \
  --tool-call-parser qwen3_coder --reasoning-parser nemotron_3
```

## Launching the server

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16 \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser nemotron_3
```

`--tp 4` is the recommended tensor-parallel degree for both H200 and B200. TP 4
stays within a single 8-GPU node, so no multi-node setup is needed.

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning:** `--reasoning-parser nemotron_3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16)
- [SGLang docs](https://docs.sglang.ai)
