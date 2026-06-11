## Overview

MiMo-V2.5 is a 311B-parameter Mixture-of-Experts model (15B active per token)
from Xiaomi, shipped as a native FP8 checkpoint. This guide covers serving it
with **SGLang** via `sglang.launch_server`, using the MiMo tool-calling parser
and the Qwen3 reasoning parser.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path XiaomiMiMo/MiMo-V2.5 \
  --trust-remote-code --tp 4 \
  --tool-call-parser mimo --reasoning-parser qwen3
```

## Launching the server

The native FP8 checkpoint (~310 GB) fits on 4×H200 at `tp 4`.

```bash
python3 -m sglang.launch_server --model-path XiaomiMiMo/MiMo-V2.5 \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser mimo \
  --reasoning-parser qwen3
```

## Features

- **Tool calling:** `--tool-call-parser mimo`
- **Reasoning (thinking mode):** `--reasoning-parser qwen3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "XiaomiMiMo/MiMo-V2.5",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/XiaomiMiMo/MiMo-V2.5)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
