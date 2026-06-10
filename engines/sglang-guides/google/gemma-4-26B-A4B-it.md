## Overview

Gemma 4 26B-A4B IT is Google's multimodal Mixture-of-Experts model — 26B total
parameters with 4B active per token across 128 fine-grained experts (top-8
routing) — featuring a thinking (reasoning) mode and a tool-use protocol, with a
128K-token context window. This guide covers serving it with **SGLang**.

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
  python3 -m sglang.launch_server --model-path google/gemma-4-26B-A4B-it \
  --trust-remote-code --tp 1 \
  --tool-call-parser gemma4 --reasoning-parser gemma4
```

## Launching the server

With only 4B active parameters, the model fits on a single GPU — `tp 1` on
H200, B200, or MI300X.

```bash
python3 -m sglang.launch_server --model-path google/gemma-4-26B-A4B-it \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser gemma4 \
  --reasoning-parser gemma4
```

## Features

- **Tool calling:** `--tool-call-parser gemma4`
- **Reasoning (thinking mode):** `--reasoning-parser gemma4`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-4-26B-A4B-it",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/google/gemma-4-26B-A4B-it)
- [SGLang docs](https://docs.sglang.ai)
