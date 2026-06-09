## Overview

GLM-4.6V is a ~107B-parameter vision-language MoE model from Z-AI with 12B
active parameters and a 128K-token context window. It accepts interleaved
image-text input via the OpenAI-compatible multimodal chat API. This guide
covers serving it with **SGLang**. Both BF16 (`zai-org/GLM-4.6V`) and native
FP8 (`zai-org/GLM-4.6V-FP8`) checkpoints are published; FP8 fits on a single
8×H100/H200 node.

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-4.6V-FP8 \
  --trust-remote-code --tp 8 \
  --tool-call-parser glm45 --reasoning-parser glm45
```

## Launching the server

### FP8 on a single 8×H200 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-4.6V-FP8 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm45 \
  --reasoning-parser glm45
```

### BF16 on a single 8×H100 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-4.6V \
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
    "model": "zai-org/GLM-4.6V",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://example.com/image.png"}},
      {"type": "text", "text": "Describe this image."}
    ]}],
    "max_tokens": 64
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-4.6V)
- [FP8 checkpoint](https://huggingface.co/zai-org/GLM-4.6V-FP8)
- [SGLang docs](https://docs.sglang.ai)
