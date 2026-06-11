## Overview

Ling-2.6-flash is a 104B-parameter Mixture-of-Experts model (7.4B active per
token) from inclusionAI's Bailing family, shipped in BF16. This guide covers
serving it with **SGLang** via `sglang.launch_server`, using the
Qwen2.5-compatible tool-calling parser.

## Prerequisites

- **SGLang:** 0.5.10.post1 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10.post1"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path inclusionAI/Ling-2.6-flash \
  --trust-remote-code --tp 2 \
  --tool-call-parser qwen25
```

## Launching the server

The BF16 checkpoint (~210 GB) fits on 2×H200 at `tp 2`. AMD MI300X runs `tp 2`.

```bash
python3 -m sglang.launch_server --model-path inclusionAI/Ling-2.6-flash \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser qwen25
```

## Features

- **Tool calling:** `--tool-call-parser qwen25`
- Ling-2.6-flash is an instruct (non-thinking) model, so no reasoning parser is
  configured.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inclusionAI/Ling-2.6-flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/inclusionAI/Ling-2.6-flash)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
