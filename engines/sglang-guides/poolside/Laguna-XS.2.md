## Overview

Laguna XS.2 is Poolside's 33B-total / 3B-activated Mixture-of-Experts coding
model with mixed sliding-window + global attention, native interleaved
reasoning, and 128K context — designed for agentic coding. This guide covers
serving the BF16 checkpoint with **SGLang**, which supports the model through
its native `laguna.py` implementation and ships Poolside's `poolside_v1` tool
and reasoning parsers.

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
  python3 -m sglang.launch_server --model-path poolside/Laguna-XS.2 \
  --trust-remote-code --tp 1 \
  --tool-call-parser poolside_v1 --reasoning-parser poolside_v1
```

## Launching the server

At 33B total / 3B active in BF16 the checkpoint fits on a single 80GB+ GPU
(H100/H200/B200) at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path poolside/Laguna-XS.2 \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser poolside_v1 \
  --reasoning-parser poolside_v1
```

## Features

- **Tool calling:** `--tool-call-parser poolside_v1` — Poolside's XML-style
  tool-call protocol.
- **Reasoning (interleaved thinking):** `--reasoning-parser poolside_v1`.
  Thinking is off by default in the chat template; toggle it per request via
  `chat_template_kwargs: {"enable_thinking": true}`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "poolside/Laguna-XS.2",
    "messages": [{"role": "user", "content": "Write a Python retry wrapper with exponential backoff."}],
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/poolside/Laguna-XS.2)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
