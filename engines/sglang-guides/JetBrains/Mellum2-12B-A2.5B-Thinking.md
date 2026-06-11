## Overview

Mellum2-12B-A2.5B-Thinking is JetBrains' reasoning-augmented code
Mixture-of-Experts model (12B total / 2.5B active) that emits explicit
`<think>` chains for debugging, planning, and agentic coding. This guide covers
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
  python3 -m sglang.launch_server --model-path JetBrains/Mellum2-12B-A2.5B-Thinking \
  --trust-remote-code --tp 1
```

## Launching the server

At 12B total / 2.5B active in BF16 (~29 GB) the checkpoint fits on a single GPU
at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path JetBrains/Mellum2-12B-A2.5B-Thinking \
  --trust-remote-code \
  --tp 1
```

## Features

The Thinking checkpoint emits its chain-of-thought inside `<think>...</think>`
blocks before the final answer. No native SGLang reasoning-parser id is
confirmed for Mellum2 (it runs via the transformers backend), so the `<think>`
content is emitted inline in the response — parse it client-side. JetBrains
recommends sampling at `temperature=0.6`, `top_p=0.95`, `top_k=20`.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "JetBrains/Mellum2-12B-A2.5B-Thinking",
    "messages": [{"role": "user", "content": "Is 1024 a power of 2? Explain your reasoning."}],
    "max_tokens": 512
  }'
```

## References

- [Model card](https://huggingface.co/JetBrains/Mellum2-12B-A2.5B-Thinking)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
