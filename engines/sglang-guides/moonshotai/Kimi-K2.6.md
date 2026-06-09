## Overview

Kimi-K2.6 is Moonshot AI's trillion-parameter native multimodal agentic MoE model
(approximately 32B active parameters per token) with INT4 weights, combining vision-language
understanding with tool calling and thinking modes. This guide covers serving it with
**SGLang** using the INT4 checkpoint `moonshotai/Kimi-K2.6` — a quantization-aware trained
INT4 model that reduces memory footprint compared to FP8 variants. As a multimodal model,
it accepts OpenAI-compatible image inputs via the `image_url` content type in chat messages.

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
  python3 -m sglang.launch_server --model-path moonshotai/Kimi-K2.6 \
  --trust-remote-code --tp 8 \
  --tool-call-parser kimi_k2 --reasoning-parser kimi_k2
```

## Launching the server

### Single-node on H200 or B300 (8 GPUs, --tp 8)

```bash
python3 -m sglang.launch_server --model-path moonshotai/Kimi-K2.6 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser kimi_k2 \
  --reasoning-parser kimi_k2
```

### Single-node on MI300X, MI325X, or MI355X (8 GPUs, --tp 4)

```bash
python3 -m sglang.launch_server --model-path moonshotai/Kimi-K2.6 \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser kimi_k2 \
  --reasoning-parser kimi_k2
```

All hardware entries in the block have `tp <= gpu_count` (H200/B300 with 8 GPUs use tp 8;
MI300X/MI325X/MI355X with 8 GPUs use tp 4). No multi-node configuration is required for
this model.

## Features

- **Tool calling:** `--tool-call-parser kimi_k2`
- **Reasoning (thinking mode):** `--reasoning-parser kimi_k2`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "moonshotai/Kimi-K2.6",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/moonshotai/Kimi-K2.6)
- [SGLang docs](https://docs.sglang.ai)
