## Overview

MiniCPM-V 4.6 is OpenBMB's pocket-sized (~1.3B) multimodal LLM for efficient
single-image, multi-image, and video understanding, built on a SigLIP2-400M
vision encoder plus a Qwen3.5-0.8B hybrid-attention backbone. This guide covers
serving the BF16 checkpoint with **SGLang**, which supports the model through
its native `minicpmv.py` vision-language path.

## Prerequisites

- **SGLang:** 0.5.6 or newer (a recent nightly Docker image is recommended for
  the VLM path).
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
  python3 -m sglang.launch_server --model-path openbmb/MiniCPM-V-4.6 \
  --trust-remote-code --tp 1 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

At ~1.3B params the BF16 checkpoint fits comfortably on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path openbmb/MiniCPM-V-4.6 \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder` — the v4.6 chat template
  emits Qwen3-Coder-style `<tool_call>` blocks.
- **Reasoning:** `--reasoning-parser qwen3`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openbmb/MiniCPM-V-4.6",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://huggingface.co/datasets/openbmb/DemoCase/resolve/main/refract.png"}},
      {"type": "text", "text": "What causes this phenomenon?"}
    ]}],
    "max_tokens": 64
  }'
```

## References

- [Model card](https://huggingface.co/openbmb/MiniCPM-V-4.6)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
