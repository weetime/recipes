## Overview

Kimi-Linear-48B-A3B-Instruct is a 48B-parameter instruction-tuned Mixture-of-Experts
model (~3B activated per token) with a linear-attention variant supporting context
up to 1M tokens. **SGLang** serves it natively via `kimi_linear.py`.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom linear-attention MoE architecture).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path moonshotai/Kimi-Linear-48B-A3B-Instruct \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~106 GB) fits on a single H200 GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path moonshotai/Kimi-Linear-48B-A3B-Instruct \
  --trust-remote-code \
  --tp 1
```

Very long context (up to 1M tokens) increases KV-cache demand substantially; raise
`--tp` to 2 if you serve near the full context window.

## Features

Kimi-Linear-48B-A3B-Instruct has no dedicated SGLang tool-call or reasoning parser;
serve it as a plain chat model.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshotai/Kimi-Linear-48B-A3B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Instruct)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
