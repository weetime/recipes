## Overview

GLM-5.1 is a 744B-parameter frontier MoE model from Z-AI. This guide covers
serving it with **SGLang**. Both BF16 (`zai-org/GLM-5.1`) and native FP8
(`zai-org/GLM-5.1-FP8`) checkpoints are published; FP8 fits on a single
8×H200 node, BF16 requires multi-node tensor parallelism.

## Prerequisites

- **SGLang:** 0.5.10 or newer.
- **DeepGEMM (FP8):** required for best FP8 performance.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path zai-org/GLM-5.1-FP8 \
  --trust-remote-code --tp 8 \
  --tool-call-parser glm47 --reasoning-parser glm45
```

## Launching the server

### FP8 on a single 8×H200 node

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1-FP8 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser glm47 \
  --reasoning-parser glm45
```

### BF16 multi-node (tensor parallel across nodes)

BF16 weights exceed a single node, so tensor parallelism spans multiple nodes.
On H200/B200 (8 GPU/node) this is `--tp 16` over 2 nodes; on H100 it is
`--tp 32` over 4 nodes. Set `$HEAD_IP` to the rank-0 node's address and launch
the same command on every node, incrementing `--node-rank`:

```bash
# Head (rank 0) — 4-node H100 example
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1 \
  --trust-remote-code \
  --tp 32 \
  --nnodes 4 --node-rank 0 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser glm47 --reasoning-parser glm45

# Worker — replicate on nodes 1..3 with --node-rank 1, 2, 3
python3 -m sglang.launch_server --model-path zai-org/GLM-5.1 \
  --trust-remote-code \
  --tp 32 \
  --nnodes 4 --node-rank 1 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser glm47 --reasoning-parser glm45
```

The interactive command builder above renders the exact head/worker commands
for your selected hardware.

## Features

- **Tool calling:** `--tool-call-parser glm47`
- **Reasoning (thinking mode):** `--reasoning-parser glm45`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-5.1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-5.1)
- [FP8 checkpoint](https://huggingface.co/zai-org/GLM-5.1-FP8)
- [SGLang docs](https://docs.sglang.ai)
