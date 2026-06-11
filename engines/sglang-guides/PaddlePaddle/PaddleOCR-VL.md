## Overview

PaddleOCR-VL is PaddlePaddle's compact (~0.9B) vision-language model for
document parsing — OCR, tables, formulas, and chart recognition — pairing a
NaViT-style dynamic-resolution vision encoder with an ERNIE-4.5-0.3B language
model. This guide covers serving the BF16 checkpoint with **SGLang**, which
supports the model through its native `paddleocr_vl.py` implementation.

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
  python3 -m sglang.launch_server --model-path PaddlePaddle/PaddleOCR-VL \
  --trust-remote-code --tp 1
```

## Launching the server

At ~0.9B params the BF16 checkpoint fits on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path PaddlePaddle/PaddleOCR-VL \
  --trust-remote-code \
  --tp 1
```

## Features

PaddleOCR-VL is an OCR/document-parsing VLM with no tool-call or reasoning
parser. Drive it with task-specific prompts such as `OCR:`, `Table Recognition:`,
`Formula Recognition:`, and `Chart Recognition:`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "PaddlePaddle/PaddleOCR-VL",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://.../receipt.png"}},
      {"type": "text", "text": "OCR:"}
    ]}],
    "temperature": 0.0,
    "max_tokens": 512
  }'
```

## References

- [Model card](https://huggingface.co/PaddlePaddle/PaddleOCR-VL)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
