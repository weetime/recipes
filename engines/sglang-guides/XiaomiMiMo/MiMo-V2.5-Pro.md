## Overview

MiMo-V2.5-Pro is a 1T-parameter Mixture-of-Experts model (42B active per token)
from Xiaomi, shipped as a native FP8 checkpoint. This guide covers serving it
with **SGLang** via `sglang.launch_server`, using the MiMo tool-calling and
reasoning parsers.

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
  python3 -m sglang.launch_server --model-path XiaomiMiMo/MiMo-V2.5-Pro \
  --trust-remote-code --tp 8 \
  --tool-call-parser mimo --reasoning-parser mimo
```

## Launching the server

At ~1 TB the FP8 checkpoint exceeds a single 8×H200 node, so it is served
multi-node. Each node runs `tp 8`; the command builder derives the multi-node
launch (`--nnodes` / `--node-rank` / `--dist-init-addr`) from that base.

```bash
python3 -m sglang.launch_server --model-path XiaomiMiMo/MiMo-V2.5-Pro \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser mimo \
  --reasoning-parser mimo
```

## Features

- **Tool calling:** `--tool-call-parser mimo`
- **Reasoning (thinking mode):** `--reasoning-parser mimo`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "XiaomiMiMo/MiMo-V2.5-Pro",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
