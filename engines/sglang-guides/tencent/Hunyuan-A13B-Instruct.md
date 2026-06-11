## Overview

Hunyuan-A13B-Instruct is Tencent's instruct-tuned Hunyuan Mixture-of-Experts
model (80B total / 13B active). This guide covers serving the BF16 checkpoint
with **SGLang**, which implements the model natively (`hunyuan.py`) and ships the
`hunyuan_a13b` tool-call and reasoning parsers.

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
  python3 -m sglang.launch_server --model-path tencent/Hunyuan-A13B-Instruct \
  --trust-remote-code --tp 2 \
  --tool-call-parser hunyuan_a13b --reasoning-parser hunyuan_a13b
```

## Launching the server

The BF16 checkpoint (~176 GB weights) is served at `tp 2` on AMD MI300X / MI325X
/ MI355X — a single 192 GB GPU leaves no room for KV cache, so two GPUs are used.

```bash
python3 -m sglang.launch_server --model-path tencent/Hunyuan-A13B-Instruct \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser hunyuan_a13b \
  --reasoning-parser hunyuan_a13b
```

## Features

- **Tool calling:** `--tool-call-parser hunyuan_a13b`
- **Reasoning (thinking mode):** `--reasoning-parser hunyuan_a13b`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tencent/Hunyuan-A13B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/tencent/Hunyuan-A13B-Instruct)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
