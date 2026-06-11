## Overview

MiniMax-M2 is a 230B-parameter Mixture-of-Experts language model (10B active
per token) for coding, agent toolchains, and long-context reasoning, shipped as
a native FP8 checkpoint. This guide covers serving it with **SGLang** via
`sglang.launch_server`, including MiniMax's tool-calling and reasoning parsers.

## Prerequisites

- **SGLang:** 0.5.4.post3 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.4.post3"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path MiniMaxAI/MiniMax-M2 \
  --trust-remote-code --tp 2 \
  --tool-call-parser minimax-m2 --reasoning-parser minimax-append-think
```

## Launching the server

The native FP8 checkpoint (~230 GB) fits on 2×H200 at `tp 2`, or 4×H100 at
`tp 4`. AMD MI300X / MI325X run at `tp 2`.

```bash
python3 -m sglang.launch_server --model-path MiniMaxAI/MiniMax-M2 \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser minimax-m2 \
  --reasoning-parser minimax-append-think
```

## Features

- **Tool calling:** `--tool-call-parser minimax-m2`
- **Reasoning (thinking mode):** `--reasoning-parser minimax-append-think`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "MiniMaxAI/MiniMax-M2",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/MiniMaxAI/MiniMax-M2)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
