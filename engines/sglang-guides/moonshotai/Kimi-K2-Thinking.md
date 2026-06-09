## Overview

Kimi-K2-Thinking is Moonshot AI's trillion-parameter Mixture-of-Experts reasoning model
(approximately 32B active parameters per token), designed for long-horizon agent workflows
that interleave chain-of-thought thinking with tool calls. This guide covers serving it with
**SGLang** using the native INT4 checkpoint `moonshotai/Kimi-K2-Thinking`, which fits on a
single 8-GPU node of H200 or B200.

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
  python3 -m sglang.launch_server --model-path moonshotai/Kimi-K2-Thinking \
  --trust-remote-code --tp 8 \
  --tool-call-parser kimi_k2 --reasoning-parser kimi_k2
```

## Launching the server

### Single-node (8×H200 or 8×B200)

```bash
python3 -m sglang.launch_server --model-path moonshotai/Kimi-K2-Thinking \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser kimi_k2 \
  --reasoning-parser kimi_k2
```

Both H200 and B200 entries in the block carry `--tp 8`, which fits within a single
8-GPU node. No multi-node configuration is required for this model.

## Features

- **Tool calling:** `--tool-call-parser kimi_k2`
- **Reasoning (thinking mode):** `--reasoning-parser kimi_k2`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshotai/Kimi-K2-Thinking",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/moonshotai/Kimi-K2-Thinking)
- [SGLang docs](https://docs.sglang.ai)
