## Overview

Qwen3-Next-80B-A3B-Instruct is an advanced MoE model from the Qwen team, with 80B total parameters and 3B active parameters. It features a hybrid attention mechanism and a highly sparse Mixture-of-Experts structure. This guide covers serving it with **SGLang**.

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
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-Next-80B-A3B-Instruct \
  --trust-remote-code --tp 4 \
  --tool-call-parser qwen
```

## Launching the server

All listed hardware profiles have `tp` values at or below 8 GPUs per node (H100: 4, H200: 2, B200: 2), so the model is always served on a single node.

```bash
# H100 (4 GPUs)
python3 -m sglang.launch_server --model-path Qwen/Qwen3-Next-80B-A3B-Instruct \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser qwen

# H200 or B200 (2 GPUs)
python3 -m sglang.launch_server --model-path Qwen/Qwen3-Next-80B-A3B-Instruct \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser qwen
```

## Features

- **Tool calling:** `--tool-call-parser qwen`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-Next-80B-A3B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct)
- [SGLang docs](https://docs.sglang.ai)
