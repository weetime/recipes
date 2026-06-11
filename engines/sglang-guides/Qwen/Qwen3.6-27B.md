## Overview

Qwen3.6-27B is a dense multimodal model with gated delta networks hybrid
attention, Multi-Token Prediction (NEXTN), and a 262K context. This guide
covers serving the BF16 checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- `--trust-remote-code` is required (custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3.6-27B \
  --trust-remote-code --tp 1 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

The BF16 checkpoint (~59 GB weights) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3.6-27B \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning (thinking mode):** `--reasoning-parser qwen3`
- **MTP / speculative decoding:** the checkpoint ships NEXTN MTP weights; enable
  SGLang speculative decoding to accelerate decode.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3.6-27B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3.6-27B)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
