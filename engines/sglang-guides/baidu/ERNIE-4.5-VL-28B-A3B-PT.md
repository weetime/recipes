## Overview

ERNIE-4.5-VL-28B-A3B-PT is Baidu's ERNIE 4.5 vision-language Mixture-of-Experts
model (28B total / 3B active) with heterogeneous text/vision experts. This guide
covers serving the BF16 checkpoint with **SGLang**, which implements the model
natively (`ernie45_vl.py`).

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
  python3 -m sglang.launch_server --model-path baidu/ERNIE-4.5-VL-28B-A3B-PT \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint fits on a single AMD MI300X / MI325X / MI355X GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path baidu/ERNIE-4.5-VL-28B-A3B-PT \
  --trust-remote-code \
  --tp 1
```

## Features

- **Vision:** send images via OpenAI-compatible `image_url` content blocks.

Tool-calling / reasoning parser names for SGLang are not yet confirmed (issue
#13 records the native impl only) — verify against your SGLang build before
enabling them.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "baidu/ERNIE-4.5-VL-28B-A3B-PT",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/baidu/ERNIE-4.5-VL-28B-A3B-PT)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
