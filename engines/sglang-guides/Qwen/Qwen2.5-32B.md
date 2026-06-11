## Overview

Qwen2.5-32B is a 32B-parameter dense **base** (pretrained) language model for
text completion, with a 128K-token context window. This guide covers serving the
BF16 checkpoint with **SGLang**. As a base model it has no chat tool-call or
reasoning protocol.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen2.5-32B \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~70 GB weights) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen2.5-32B \
  --trust-remote-code \
  --tp 1
```

## Features

This is a pretrained base model — SGLang serves it as a text-completion
endpoint, with no tool-call or reasoning parser.

## Verify

```bash
curl http://localhost:30000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-32B",
    "prompt": "The capital of France is",
    "max_tokens": 16
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen2.5-32B)
- [SGLang docs](https://docs.sglang.ai)
