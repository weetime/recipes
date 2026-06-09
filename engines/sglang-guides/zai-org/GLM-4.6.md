## Overview

GLM-4.6 is a ~357B-parameter MoE language model from Z-AI with 32B active
parameters and a 202K-token context window. This guide covers serving it with
**SGLang**. Both BF16 (`zai-org/GLM-4.6`) and native FP8
(`zai-org/GLM-4.6-FP8`) checkpoints are published; FP8 fits on a single
8×H200 node and is the recommended precision for cost-efficient serving.

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-4.6-FP8 \
  --trust-remote-code --tp 8 \
  --tool-call-parser glm45 --reasoning-parser glm45
```

## Launching the server

### FP8 on a single 8×H200 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-4.6-FP8 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm45 \
  --reasoning-parser glm45
```

### BF16 on a single 8×H200 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-4.6 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm45 \
  --reasoning-parser glm45
```

## Features

- **Tool calling:** `--tool-call-parser glm45`
- **Reasoning (thinking mode):** `--reasoning-parser glm45`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-4.6",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-4.6)
- [FP8 checkpoint](https://huggingface.co/zai-org/GLM-4.6-FP8)
- [SGLang docs](https://docs.sglang.ai)
