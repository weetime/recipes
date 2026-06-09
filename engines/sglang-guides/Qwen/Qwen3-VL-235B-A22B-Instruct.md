## Overview

Qwen3-VL-235B-A22B-Instruct is the flagship vision-language MoE model in the Qwen3 series, with 235B total parameters and 22B active parameters. It supports images, video, and long-context text up to 262K tokens, and accepts OpenAI-compatible multimodal image inputs via the `image_url` content type. This guide covers serving it with **SGLang**.

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
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-VL-235B-A22B-Instruct \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen
```

## Launching the server

All three listed hardware profiles (H100, H200, B200) have `tp 8`, which fits within a single 8-GPU node.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3-VL-235B-A22B-Instruct \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser qwen
```

## Features

- **Tool calling:** `--tool-call-parser qwen`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-VL-235B-A22B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-VL-235B-A22B-Instruct)
- [SGLang docs](https://docs.sglang.ai)
