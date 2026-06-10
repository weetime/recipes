## Overview

Gemma 4 31B IT is Google's unified multimodal dense model (31B) with native
text, image, and audio understanding, a thinking (reasoning) mode, a tool-use
protocol, and a 256K-token context window. This guide covers serving it with
**SGLang**.

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
  python3 -m sglang.launch_server --model-path google/gemma-4-31B-it \
  --trust-remote-code --tp 2 \
  --tool-call-parser gemma4 --reasoning-parser gemma4
```

## Launching the server

A dense 31B in BF16 needs `tp 2` on a single 8×H200 node. On the larger-memory
B200 or MI300X it fits with `tp 1`.

```bash
# H200
python3 -m sglang.launch_server --model-path google/gemma-4-31B-it \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser gemma4 \
  --reasoning-parser gemma4
```

```bash
# B200 / MI300X (fits on one GPU)
python3 -m sglang.launch_server --model-path google/gemma-4-31B-it \
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
    "model": "google/gemma-4-31B-it",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/google/gemma-4-31B-it)
- [SGLang docs](https://docs.sglang.ai)
