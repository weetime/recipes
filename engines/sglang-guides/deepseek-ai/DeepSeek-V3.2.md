## Overview

DeepSeek-V3.2 is a 671B-parameter MoE model (37B active) featuring DeepSeek Sparse
Attention (DSA), scalable reinforcement learning, and strong tool-use capabilities. This
guide covers serving it with **SGLang** using either the native FP8 checkpoint
(`deepseek-ai/DeepSeek-V3.2`) or the NVIDIA FP4 quantized checkpoint
(`nvidia/DeepSeek-V3.2-NVFP4`), which halves VRAM requirements.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- **DeepGEMM (FP8):** required for MQA logits computation (FP8 MoE kernels).

  ```bash
  uv pip install git+https://github.com/deepseek-ai/DeepGEMM.git@v2.1.1.post3 --no-build-isolation
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
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3.2 \
  --trust-remote-code --tp 8 \
  --tool-call-parser deepseekv32 --reasoning-parser deepseek-v3
```

## Launching the server

### FP8 on a single 8×H200 or 8×B200 node

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-V3.2 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser deepseekv32 \
  --reasoning-parser deepseek-v3
```

### NVFP4 on a single 8×H200 or 8×B200 node

The `nvidia/DeepSeek-V3.2-NVFP4` checkpoint reduces VRAM to approximately 403 GB,
fitting on a single node:

```bash
python3 -m sglang.launch_server --model-path nvidia/DeepSeek-V3.2-NVFP4 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser deepseekv32 \
  --reasoning-parser deepseek-v3
```

## Features

- **Tool calling:** `--tool-call-parser deepseekv32`
- **Reasoning (thinking mode):** `--reasoning-parser deepseek-v3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-V3.2",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-V3.2)
- [NVFP4 checkpoint](https://huggingface.co/nvidia/DeepSeek-V3.2-NVFP4)
- [SGLang docs](https://docs.sglang.ai)
