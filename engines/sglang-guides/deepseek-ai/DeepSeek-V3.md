## Overview

DeepSeek-V3 is a 671B-parameter Mixture-of-Experts model (37B active per token)
shipped with native FP8 weights, sharing its architecture with DeepSeek-R1. This
guide covers serving the native FP8 checkpoint with **SGLang**, which is one of
DeepSeek's recommended engines and implements the model's Multi-head Latent
Attention (MLA) and Multi-Token Prediction (MTP). Base V3 is a non-reasoning
model, so only the tool-calling parser is wired here (no reasoning parser).

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
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3 \
  --trust-remote-code --tp 8 \
  --tool-call-parser deepseekv3
```

## Launching the server

The native FP8 checkpoint (~671 GB) fits on a single 8×H200 or 8×B200 node at
`tp 8`.

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser deepseekv3
```

## Features

- **Tool calling:** `--tool-call-parser deepseekv3`
- **Reasoning:** not applicable — base DeepSeek-V3 is a non-reasoning model. Use
  DeepSeek-R1 or DeepSeek-V3.1 for thinking-mode reasoning.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-V3",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-V3)
- [SGLang DeepSeek usage docs](https://github.com/sgl-project/sglang/blob/main/docs/basic_usage/deepseek_v3.md)
- [SGLang docs](https://docs.sglang.ai)
