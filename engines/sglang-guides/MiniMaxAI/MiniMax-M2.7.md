## Overview

MiniMax-M2.7 is a 230B-parameter (10B active) MoE language model from MiniMax with a
196K context window. This guide covers serving the native FP8 checkpoint with
**SGLang**. The model ships pre-quantized to FP8, making it runnable on a single
8×H200/B200/B300 node.

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
  python3 -m sglang.launch_server --model-path MiniMaxAI/MiniMax-M2.7 \
  --trust-remote-code --tp 8 \
  --tool-call-parser minimax-m2 --reasoning-parser minimax-append-think
```

## Launching the server

The TP value varies by hardware: H200/B200/B300 use `--tp 8`; H100, GB200, and GB300
use `--tp 4`.

### FP8 on a single 8×H200/B200/B300 node

```bash
python3 -m sglang.launch_server --model-path MiniMaxAI/MiniMax-M2.7 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser minimax-m2 \
  --reasoning-parser minimax-append-think
```

### FP8 on a single 4×H100 node (or GB200/GB300, which are 4-GPU trays)

```bash
python3 -m sglang.launch_server --model-path MiniMaxAI/MiniMax-M2.7 \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser minimax-m2 \
  --reasoning-parser minimax-append-think
```

## Features

- **Tool calling:** `--tool-call-parser minimax-m2`
- **Reasoning:** `--reasoning-parser minimax-append-think`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MiniMaxAI/MiniMax-M2.7",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/MiniMaxAI/MiniMax-M2.7)
- [SGLang docs](https://docs.sglang.ai)
