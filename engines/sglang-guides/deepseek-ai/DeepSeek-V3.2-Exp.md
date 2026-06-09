## Overview

DeepSeek-V3.2-Exp is a 671B-parameter sparse-attention MoE model (37B active) with FP8
weights and FP8 KV cache. This guide covers serving it with **SGLang** using the native
FP8 checkpoint `deepseek-ai/DeepSeek-V3.2-Exp`.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- **DeepGEMM (FP8):** required for MQA logits computation (FP8 MoE kernels).

  ```bash
  python3 -m pip install git+https://github.com/deepseek-ai/DeepGEMM.git@v2.1.1.post3 --no-build-isolation
  ```

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
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3.2-Exp \
  --trust-remote-code --tp 8 \
  --tool-call-parser deepseekv31 --reasoning-parser deepseek-v3
```

## Launching the server

### FP8 on a single 8×H200 or 8×B200 node

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3.2-Exp \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser deepseekv31 \
  --reasoning-parser deepseek-v3
```

## Features

- **Tool calling:** `--tool-call-parser deepseekv31`
- **Reasoning (thinking mode):** `--reasoning-parser deepseek-v3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-V3.2-Exp",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-V3.2-Exp)
- [SGLang docs](https://docs.sglang.ai)
