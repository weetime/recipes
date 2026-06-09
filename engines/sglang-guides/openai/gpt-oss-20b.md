## Overview

`gpt-oss-20b` is OpenAI's 21B-total / 3.6B-active MoE open-weight reasoning model,
distributed as an MXFP4-quantized checkpoint. This guide covers serving it with
**SGLang** (`python3 -m sglang.launch_server`); the model runs on a single GPU
(`--tp 1`) with as little as 16 GB of VRAM.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (included in the launch command below).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path openai/gpt-oss-20b \
  --trust-remote-code --tp 1 \
  --tool-call-parser gpt-oss --reasoning-parser gpt-oss
```

## Launching the server

### Single GPU (H100 / H200 / B200)

```bash
python3 -m sglang.launch_server --model-path openai/gpt-oss-20b \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser gpt-oss \
  --reasoning-parser gpt-oss
```

`tp_by_hardware` is 1 for h100, h200, and b200 — the MXFP4 weights fit on a
single GPU, so no multi-node configuration is needed.

## Features

- **Tool calling:** `--tool-call-parser gpt-oss`
- **Reasoning:** `--reasoning-parser gpt-oss`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-oss-20b",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/openai/gpt-oss-20b)
- [SGLang docs](https://docs.sglang.ai)
