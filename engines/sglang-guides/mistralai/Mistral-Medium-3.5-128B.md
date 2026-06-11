## Overview

Mistral-Medium-3.5-128B is a 128B dense vision-language model from Mistral with
native FP8 weights and a 256K context window. **SGLang** serves it with `mistral`
tool-call and reasoning parsers.

## Prerequisites

- **SGLang:** a nightly / dev image is required at launch. The block pins
  `v0.5.6` as the floor, but native Mistral-Medium-3.5 support shipped only in a
  development image — pull `lmsysorg/sglang:dev` (or the nightly tag) until the
  next stable release rolls it up.
- `--trust-remote-code` is required (custom Mistral architecture).

## Install

Use the SGLang dev / nightly Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:dev \
  python3 -m sglang.launch_server --model-path mistralai/Mistral-Medium-3.5-128B \
  --trust-remote-code --tp 2 \
  --tool-call-parser mistral --reasoning-parser mistral
```

## Launching the server

The FP8 checkpoint (~141 GB) is served at `tp 2` on an H200 node for KV-cache and
long-context headroom.

```bash
python3 -m sglang.launch_server --model-path mistralai/Mistral-Medium-3.5-128B \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser mistral \
  --reasoning-parser mistral
```

## Features

- **Tool calling:** `--tool-call-parser mistral`
- **Reasoning (thinking mode):** `--reasoning-parser mistral`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-Medium-3.5-128B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
