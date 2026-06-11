## Overview

Ministral-3-14B-Instruct-2512 is a 14B dense instruction-tuned vision-language
model from Mistral with FP8 weights and a 256K context window. **SGLang** serves
it via the `mistral3` architecture.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom `mistral3` architecture).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path mistralai/Ministral-3-14B-Instruct-2512 \
  --trust-remote-code --tp 1 --tool-call-parser mistral
```

## Launching the server

The FP8 checkpoint (~15 GB) fits on a single H200 or MI300X GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path mistralai/Ministral-3-14B-Instruct-2512 \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser mistral
```

## Features

- **Tool calling:** `--tool-call-parser mistral`

This is the Instruct variant — it has no separate thinking mode, so no
`--reasoning-parser` is needed.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Ministral-3-14B-Instruct-2512",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/mistralai/Ministral-3-14B-Instruct-2512)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
