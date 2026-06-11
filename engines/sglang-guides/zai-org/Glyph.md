## Overview

Glyph is a 10B reasoning vision-language model from Z-AI used in a visual-text
compression framework that renders long text into images and processes them with
a VLM, scaling effective context length. This guide covers serving it with
**SGLang**, which serves Glyph via the native GLM-4V path (`glm4v.py`).

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
  python3 -m sglang.launch_server --model-path zai-org/Glyph \
  --trust-remote-code --tp 1 \
  --reasoning-parser glm45
```

## Launching the server

The BF16 checkpoint runs on a single H100 (or AMD MI300X/MI325X) GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path zai-org/Glyph \
  --trust-remote-code \
  --tp 1 \
  --reasoning-parser glm45
```

## Features

- **Reasoning (thinking mode):** `--reasoning-parser glm45` (Glyph is a reasoning
  VLM; the GLM-4.5-family parser applies — verify against your SGLang build).
- **Vision:** send rendered text-as-image inputs via OpenAI-compatible
  `image_url` content blocks.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/Glyph",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/Glyph)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
