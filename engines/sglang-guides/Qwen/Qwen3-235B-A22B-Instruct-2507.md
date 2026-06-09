## Overview

Qwen3-235B-A22B-Instruct-2507 is the flagship MoE instruct model in the Qwen3 series, featuring 235B total parameters and 22B active parameters. It delivers high-quality text generation with a 262K token context window. This guide covers serving it with **SGLang**.

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
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-235B-A22B-Instruct-2507 \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen
```

## Launching the server

All three listed hardware profiles (H100, H200, B200) have `tp 8`, which fits within a single 8-GPU node.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3-235B-A22B-Instruct-2507 \
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
    "model": "Qwen/Qwen3-235B-A22B-Instruct-2507",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507)
- [SGLang docs](https://docs.sglang.ai)
