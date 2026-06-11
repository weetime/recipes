## Overview

Mellum2-12B-A2.5B-Instruct is JetBrains' instruction-tuned code Mixture-of-Experts
model (12B total / 2.5B active) that answers directly without an externalized
chain of thought — tuned for low-latency coding and tool use. This guide covers
serving the BF16 checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- **Transformers backend:** SGLang has no native Mellum implementation — the
  model runs **via SGLang's HF `transformers` backend**. Make sure a recent
  `transformers` (with `MellumForCausalLM` support) is installed alongside
  SGLang.
- `--trust-remote-code` is required.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
python3 -m pip install -U transformers
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path JetBrains/Mellum2-12B-A2.5B-Instruct \
  --trust-remote-code --tp 1
```

## Launching the server

At 12B total / 2.5B active in BF16 (~29 GB) the checkpoint fits on a single GPU
at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path JetBrains/Mellum2-12B-A2.5B-Instruct \
  --trust-remote-code \
  --tp 1
```

## Features

The Instruct checkpoint answers directly and does not emit `<think>` blocks, so
no reasoning parser is needed. No native SGLang tool-call parser id is confirmed
for Mellum2; if you need function calling, parse tool-call output client-side.
JetBrains recommends sampling at `temperature=0.6`, `top_p=0.95`, `top_k=20`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "JetBrains/Mellum2-12B-A2.5B-Instruct",
    "messages": [{"role": "user", "content": "Write a Python function to reverse a string."}],
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/JetBrains/Mellum2-12B-A2.5B-Instruct)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
