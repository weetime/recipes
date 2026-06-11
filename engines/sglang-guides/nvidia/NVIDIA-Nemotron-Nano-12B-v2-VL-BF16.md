## Overview

Nemotron-Nano-12B-v2-VL is a 12B vision-language model with image and video
support, built on a hybrid-Mamba backbone. This guide covers serving the native
BF16 checkpoint with **SGLang** via `python3 -m sglang.launch_server`.

## Prerequisites

- **SGLang:** 0.5.10 or newer. VL hybrid-Mamba support is recent — use the
  **main / nightly SGLang image** (or a source build) until it lands in a tagged
  release.
- `--trust-remote-code` is required (the model ships custom modeling code).
- As a hybrid-Mamba model it relies on Mamba SSM kernels; install `mamba-ssm`
  if your image doesn't already bundle them. The Mamba state cache is
  preallocated — on long multimodal contexts, cap it with
  `--max-mamba-cache-size` (e.g. `--max-mamba-cache-size 512`) to avoid OOM.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
python3 -m pip install mamba-ssm
```

Or use the SGLang nightly/dev Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-BF16 \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~26 GB) fits on a single B200 at `tp 1`.

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-BF16 \
  --trust-remote-code \
  --tp 1 \
  --max-mamba-cache-size 512
```

## Features

This is a multimodal (vision-language) model. SGLang's reasoning and tool-call
parsers for this checkpoint are not yet confirmed, so no parser flags are set.
Send image/video content via the OpenAI-compatible chat-completions API.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-12B-v2-VL-BF16)
- [SGLang support matrix (recipes issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
