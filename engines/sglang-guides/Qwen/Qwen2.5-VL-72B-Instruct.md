## Overview

Qwen2.5-VL-72B-Instruct is a 72B-parameter dense vision-language model for
high-quality image and video understanding. This guide covers serving the BF16
checkpoint with **SGLang** via its `launch_server` (VLM) path.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom modeling code).
- A vision-language chat template — pass `--chat-template qwen2-vl`.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen2.5-VL-72B-Instruct \
  --trust-remote-code --tp 2 --chat-template qwen2-vl \
  --tool-call-parser qwen
```

## Launching the server

The BF16 checkpoint (~145 GB weights) fits on a single 2×H200 node at `tp 2`,
or a single B200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen2.5-VL-72B-Instruct \
  --trust-remote-code \
  --tp 2 \
  --chat-template qwen2-vl \
  --tool-call-parser qwen
```

## Features

- **Tool calling:** `--tool-call-parser qwen`
- **Vision input:** pass `--chat-template qwen2-vl` so image/video messages are
  formatted correctly.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2.5-VL-72B-Instruct",
    "messages": [{"role": "user", "content": [
      {"type": "text", "text": "Describe this image."},
      {"type": "image_url", "image_url": {"url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg"}}
    ]}],
    "max_tokens": 64
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen2.5-VL-72B-Instruct)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
