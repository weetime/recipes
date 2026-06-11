## Overview

Hy3-preview is Tencent's scaled-up Hunyuan Mixture-of-Experts language model
(295B total / 21B active) with a 256K context and a built-in MTP layer. This
guide covers serving the BF16 checkpoint with **SGLang**, which implements the
model natively (`hunyuan_v3.py`, with MTP support).

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
  python3 -m sglang.launch_server --model-path tencent/Hy3-preview \
  --trust-remote-code --tp 8
```

## Launching the server

The BF16 checkpoint fits on a single 8×H200 (or 8×AMD MI300X/MI325X/MI350X/MI355X)
node at `tp 8`.

```bash
python3 -m sglang.launch_server --model-path tencent/Hy3-preview \
  --trust-remote-code \
  --tp 8
```

## Features

SGLang serves Hy3-preview natively, but the parser names for its tool-calling
and thinking mode are not yet confirmed for SGLang (issue #13 records the native
impl only). Verify the available `--tool-call-parser` / `--reasoning-parser`
options against your SGLang build before enabling them.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tencent/Hy3-preview",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/tencent/Hy3-preview)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
