## Overview

Qwen3.5-122B-A10B is a mid-size Qwen3.5 multimodal Mixture-of-Experts model
(122B total / 10B active) with gated delta networks, 256 experts, and a 262K
context. This guide covers serving the BF16 checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** the Qwen3.5 family requires the SGLang **main branch** (tracked as
  v0.5.11 here). Install from source or a nightly image until a stable release
  ships it.
- `--trust-remote-code` is required (custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.11"
```

Or use the SGLang nightly Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:dev \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-122B-A10B \
  --trust-remote-code --tp 2 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

The BF16 checkpoint (~268 GB weights) fits on a 2×H200 or 2×B200 node at
`tp 2`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-122B-A10B \
  --trust-remote-code \
  --tp 2 \
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
    "model": "Qwen/Qwen3.5-122B-A10B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3.5-122B-A10B)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
