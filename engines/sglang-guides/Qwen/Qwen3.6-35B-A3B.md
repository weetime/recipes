## Overview

Qwen3.6-35B-A3B is the smaller Qwen3.6 multimodal MoE model, with 35B total parameters and 3B active parameters. It uses the same gated delta networks architecture with 256 experts (8 routed + 1 shared), and supports a 262K token context window. This guide covers serving it with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3.6-35B-A3B \
  --trust-remote-code --tp 1 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

All listed hardware profiles (H100, H200, B200) use `tp 1`, so the model runs on a single GPU.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3.6-35B-A3B \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning (chain-of-thought):** `--reasoning-parser qwen3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3.6-35B-A3B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3.6-35B-A3B)
- [FP8 checkpoint](https://huggingface.co/Qwen/Qwen3.6-35B-A3B-FP8)
- [SGLang docs](https://docs.sglang.ai)
