## Overview

GLM-4.7 is the latest 358B-parameter Mixture-of-Experts language model (32B
active per token) from Z-AI, sharing the GLM-4.5 architecture. This guide covers
serving the BF16 checkpoint with **SGLang**, which serves GLM-4.7 via the same
native `glm4_moe.py` path and `glm45` parsers as GLM-4.5.

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-4.7 \
  --trust-remote-code --tp 8 \
  --tool-call-parser glm47 --reasoning-parser glm45
```

## Launching the server

The BF16 checkpoint fits on a single 8×H200 (or 8×AMD MI300X/MI325X/MI355X) node
at `tp 8`.

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-4.7 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm47 \
  --reasoning-parser glm45
```

## Features

- **Tool calling:** `--tool-call-parser glm47`
- **Reasoning (thinking mode):** `--reasoning-parser glm45`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-4.7",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-4.7)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
