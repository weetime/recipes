## Overview

Qwen3-Coder-480B-A35B-Instruct is a large coder Mixture-of-Experts model (480B
total / 35B active) with strong tool-use and code generation. This guide covers
serving it with **SGLang** via the `launch_server` path.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom modeling code).
- 8 GPUs on a single node for the BF16 checkpoint.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-Coder-480B-A35B-Instruct \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen3_coder
```

## Launching the server

The BF16 checkpoint (~960 GB weights) fits on a single 8×H200 or 8×B200 node at
`tp 8`. Expert parallelism (`--ep-size 8`) is recommended for MoE throughput.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3-Coder-480B-A35B-Instruct \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser qwen3_coder
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder` — the Qwen3 Coder function
  schema.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    "messages": [{"role": "user", "content": "Write a quicksort in Python."}],
    "max_tokens": 128
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
