## Overview

Step-3.5-Flash is a 196B-parameter (11B active) sparse MoE reasoning model from
StepFun with hybrid attention schedules and a 256K context window. This guide covers
serving the BF16 base checkpoint (`stepfun-ai/Step-3.5-Flash`) with **SGLang** on a
single 4-GPU node. Quantized siblings are also published: FP8
(`stepfun-ai/Step-3.5-Flash-FP8`), INT8, and INT4.

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
  python3 -m sglang.launch_server --model-path stepfun-ai/Step-3.5-Flash \
  --trust-remote-code --tp 4 \
  --tool-call-parser step3p5 --reasoning-parser step3p5
```

## Launching the server

### BF16 on a single 4×H200/MI300X/MI325X/MI355X node

```bash
python3 -m sglang.launch_server --model-path stepfun-ai/Step-3.5-Flash \
  --trust-remote-code \
  --tp 4 \
  --tool-call-parser step3p5 \
  --reasoning-parser step3p5
```

## Features

- **Tool calling:** `--tool-call-parser step3p5`
- **Reasoning:** `--reasoning-parser step3p5`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "stepfun-ai/Step-3.5-Flash",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/stepfun-ai/Step-3.5-Flash)
- [FP8 checkpoint](https://huggingface.co/stepfun-ai/Step-3.5-Flash-FP8)
- [SGLang docs](https://docs.sglang.ai)
