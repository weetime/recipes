## Overview

GLM-OCR is a compact (0.9B) image-to-text OCR vision-language model from Z-AI.
This guide covers serving it with **SGLang**, which implements the model
natively (`glm_ocr.py`).

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-OCR \
  --trust-remote-code --tp 1
```

## Launching the server

This compact OCR model runs on a single H200 GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-OCR \
  --trust-remote-code \
  --tp 1
```

## Features

This is an OCR/vision model — no chat tool-call or reasoning parser applies.
Send images via the OpenAI-compatible `image_url` content blocks.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-OCR",
    "messages": [{"role": "user", "content": [
      {"type": "text", "text": "Transcribe the text in this image."},
      {"type": "image_url", "image_url": {"url": "https://example.com/doc.png"}}
    ]}],
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-OCR)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
