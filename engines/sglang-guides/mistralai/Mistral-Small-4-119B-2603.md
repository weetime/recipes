## Overview

Mistral Small 4 is a 119B-parameter (6.5B active) hybrid MoE model from Mistral AI
with a 256K context window. It accepts interleaved image-text input via the
OpenAI-compatible multimodal chat API. This guide covers serving the native FP8 checkpoint
with **SGLang**. The model ships pre-quantized to FP8, fitting on 1–2 GPUs depending on
hardware generation.

## Prerequisites

- **SGLang:** 0.5.8 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.8"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path mistralai/Mistral-Small-4-119B-2603 \
  --trust-remote-code --tp 2 \
  --tool-call-parser mistral --reasoning-parser mistral
```

## Launching the server

The TP value varies by hardware: H100 and H200 use `--tp 2`; B200 and B300 use
`--tp 1`.

### FP8 on 2×H100 or 2×H200

```bash
python3 -m sglang.launch_server \
  --model-path mistralai/Mistral-Small-4-119B-2603 \
  --trust-remote-code \
  --tp 2 \
  --tool-call-parser mistral \
  --reasoning-parser mistral
```

### FP8 on a single B200 or B300

```bash
python3 -m sglang.launch_server \
  --model-path mistralai/Mistral-Small-4-119B-2603 \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser mistral \
  --reasoning-parser mistral
```

## Features

- **Tool calling:** `--tool-call-parser mistral`
- **Reasoning:** `--reasoning-parser mistral`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-Small-4-119B-2603",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603)
- [SGLang docs](https://docs.sglang.ai)
