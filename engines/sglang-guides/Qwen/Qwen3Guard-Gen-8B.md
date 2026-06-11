## Overview

Qwen3Guard-Gen-8B is a lightweight text-only guardrail / safety classifier in
the Qwen3Guard family (the generative "Gen" variant, not the streaming "Stream"
one). This guide covers serving the BF16 checkpoint with **SGLang**; it emits
safety classifications over the OpenAI-compatible chat API.

## Prerequisites

- **SGLang:** 0.4.6.post1 or newer.
- `--trust-remote-code` is required (custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.4.6.post1"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3Guard-Gen-8B \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~18 GB weights) fits on a single GPU with >=20 GB VRAM at
`tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3Guard-Gen-8B \
  --trust-remote-code \
  --tp 1
```

## Features

This is a guardrail classifier — no tool-calling or reasoning parsers apply.
Send the content to classify as a normal chat message and read the safety
verdict from the response.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3Guard-Gen-8B",
    "messages": [{"role": "user", "content": "How do I bake bread?"}],
    "max_tokens": 64
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3Guard-Gen-8B)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
