## Overview

Qwen3.5-397B-A17B is a multimodal MoE model featuring a gated delta networks architecture, with 397B total parameters and 17B active parameters. It supports images, text, and a 262K token context window. This guide covers serving it with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.8 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.8"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-397B-A17B \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen3_coder --reasoning-parser qwen3
```

## Launching the server

### Single-node (H200, B200, MI300X, and most hardware)

H200, B200, and MI300X each use `tp 8`, fitting within a single 8-GPU node. MI325X and MI355X use `tp 4`, also single-node.

```bash
# H200, B200, MI300X (tp 8)
python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-397B-A17B \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3

# MI325X, MI355X (tp 4)
python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-397B-A17B \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

### Multi-node (tensor parallel across nodes)

H100 uses `tp 16`, which spans 2 nodes (8 GPUs per node). Set `$HEAD_IP` to the rank-0 node's address and launch the same command on both nodes, incrementing `--node-rank`:

```bash
# Head (rank 0)
python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-397B-A17B \
  --trust-remote-code \
  --tp 16 \
  --nnodes 2 --node-rank 0 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3

# Worker — replicate on node 1 with --node-rank 1
python3 -m sglang.launch_server --model-path Qwen/Qwen3.5-397B-A17B \
  --trust-remote-code \
  --tp 16 \
  --nnodes 2 --node-rank 1 --dist-init-addr $HEAD_IP:5000 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser qwen3
```

The command builder above renders the exact head/worker commands for your selected hardware.

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder`
- **Reasoning (chain-of-thought):** `--reasoning-parser qwen3`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen3.5-397B-A17B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3.5-397B-A17B)
- [GPTQ-Int4 checkpoint](https://huggingface.co/Qwen/Qwen3.5-397B-A17B-GPTQ-Int4)
- [SGLang docs](https://docs.sglang.ai)
