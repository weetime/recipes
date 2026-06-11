## Overview

Qwen3-32B is a 32B-parameter dense model with hybrid thinking / non-thinking
modes and a 40K-token context window. This guide covers serving the BF16
checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-32B \
  --trust-remote-code --tp 1 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

The BF16 checkpoint (~70 GB weights) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3-32B \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning (thinking mode):** `--reasoning-parser qwen3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-32B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-32B)
- [SGLang docs](https://docs.sglang.ai)
