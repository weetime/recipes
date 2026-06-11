## Overview

PaddleOCR-VL-1.5 is the next-generation compact (~0.9B) vision-language model
for document parsing — same architecture as PaddleOCR-VL (NaViT-style
dynamic-resolution vision encoder + ERNIE-4.5-0.3B LM), with accuracy gains and
new tasks: text spotting, seal recognition, and Tibetan/Bengali. This guide
covers serving the BF16 checkpoint with **SGLang**, which supports the model
through the same native `paddleocr_vl.py` implementation as v1.0.

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
  python3 -m sglang.launch_server --model-path PaddlePaddle/PaddleOCR-VL-1.5 \
  --trust-remote-code --tp 1
```

## Launching the server

At ~0.9B params the BF16 checkpoint fits on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path PaddlePaddle/PaddleOCR-VL-1.5 \
  --trust-remote-code \
  --tp 1
```

## Features

PaddleOCR-VL-1.5 is an OCR/document-parsing VLM with no tool-call or reasoning
parser. Drive it with task-specific prompts such as `OCR:`, `Table Recognition:`,
`Formula Recognition:`, `Chart Recognition:`, and the new `Spotting:` and
`Seal Recognition:` tasks.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "PaddlePaddle/PaddleOCR-VL-1.5",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://.../receipt.png"}},
      {"type": "text", "text": "Spotting:"}
    ]}],
    "temperature": 0.0,
    "max_tokens": 512
  }'
```

## References

- [Model card](https://huggingface.co/PaddlePaddle/PaddleOCR-VL-1.5)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
