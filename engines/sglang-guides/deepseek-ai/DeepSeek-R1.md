## Overview

DeepSeek-R1 is a 671B-parameter Mixture-of-Experts reasoning model (37B active
per token) built on the DeepSeek-V3 architecture and trained with large-scale
reinforcement learning for strong chain-of-thought. This guide covers serving
the native FP8 checkpoint with **SGLang**, which is one of DeepSeek's
recommended engines and implements the model's Multi-head Latent Attention (MLA)
and Multi-Token Prediction (MTP).

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
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-R1 \
  --trust-remote-code --tp 8 \
  --tool-call-parser deepseekv3 --reasoning-parser deepseek-r1
```

## Launching the server

The native FP8 checkpoint (~671 GB) fits on a single 8×H200 or 8×B200 node at
`tp 8`.

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-R1 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser deepseekv3 \
  --reasoning-parser deepseek-r1
```

## Features

- **Tool calling:** `--tool-call-parser deepseekv3`
- **Reasoning (thinking mode):** `--reasoning-parser deepseek-r1` — note SGLang's
  parser id is `deepseek-r1`, distinct from vLLM's `deepseek_r1`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-R1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-R1)
- [SGLang DeepSeek usage docs](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md)
- [SGLang docs](https://docs.sglang.ai)
