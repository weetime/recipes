## Overview

Intern-S1 is a 241B-parameter (28B active) vision-language MoE model from Shanghai AI
Laboratory. This guide covers serving it with **SGLang**. The BF16 checkpoint
(`internlm/Intern-S1`) is the only variant published; it accepts both text and image
inputs via the standard OpenAI-compatible multimodal message format.

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
  python3 -m sglang.launch_server --model-path internlm/Intern-S1 \
  --trust-remote-code --tp 8 \
  --tool-call-parser interns1 --reasoning-parser interns1
```

## Launching the server

### BF16 on a single 8×H100/H200/B200 node

```bash
python3 -m sglang.launch_server --model-path internlm/Intern-S1 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser interns1 \
  --reasoning-parser interns1
```

## Features

- **Tool calling:** `--tool-call-parser interns1`
- **Reasoning:** `--reasoning-parser interns1`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "internlm/Intern-S1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/internlm/Intern-S1)
- [SGLang docs](https://docs.sglang.ai)
