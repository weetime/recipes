## Overview

MiniCPM5-1B is OpenBMB's dense ~1.1B on-device LLM with hybrid Think/No-Think
reasoning, native 128K context, and strong agentic tool use, built on the
standard Llama architecture. This guide covers serving the BF16 checkpoint with
**SGLang**, which ships the model's `minicpm5` tool-call parser built-in and is
the author-recommended backend for tool calling.

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
  python3 -m sglang.launch_server --model-path openbmb/MiniCPM5-1B \
  --trust-remote-code --tp 1 \
  --tool-call-parser minicpm5
```

## Launching the server

At ~1.1B params the BF16 checkpoint fits comfortably on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path openbmb/MiniCPM5-1B \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser minicpm5
```

## Features

- **Tool calling:** `--tool-call-parser minicpm5` — MiniCPM5-1B emits XML-style
  tool calls; SGLang ships this parser built-in.

Hybrid reasoning (Think / No-Think) is toggled by the chat template's
`enable_thinking` flag at request time, not a server parser.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openbmb/MiniCPM5-1B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/openbmb/MiniCPM5-1B)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
