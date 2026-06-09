## Overview

Llama 4 Scout is Meta's 109B-parameter (17B active) MoE model with 16 experts. This
guide covers serving it with **SGLang**. The BF16 checkpoint
(`meta-llama/Llama-4-Scout-17B-16E-Instruct`) is the served variant.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).
- Accept Meta's Llama 4 Community License before downloading.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path meta-llama/Llama-4-Scout-17B-16E-Instruct \
  --trust-remote-code --tp 8 \
  --tool-call-parser pythonic
```

## Launching the server

### BF16 on a single 8×H100/H200/B200 node

```bash
python3 -m sglang.launch_server \
  --model-path meta-llama/Llama-4-Scout-17B-16E-Instruct \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser pythonic
```

## Features

- **Tool calling:** `--tool-call-parser pythonic`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct)
- [SGLang docs](https://docs.sglang.ai)
