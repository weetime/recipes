## Overview

Seed-OSS-36B-Instruct is a dense 36B language model from ByteDance Seed with a
unique "thinking budget" control for chain-of-thought length and up to 512K
context. This guide covers serving the BF16 checkpoint with **SGLang**.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- **Transformers fallback:** SGLang does not yet ship a native Seed-OSS model
  implementation — it runs through SGLang's **HF `transformers` backend** (the
  native PR is still open upstream). Make sure you have a recent `transformers`
  installed alongside SGLang.
- `--trust-remote-code` is required (the model ships custom modeling code, and
  the transformers fallback path needs it).

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
  python3 -m sglang.launch_server --model-path ByteDance-Seed/Seed-OSS-36B-Instruct \
  --trust-remote-code --tp 1
```

## Launching the server

At 36B in BF16 the checkpoint fits on a single high-memory GPU (e.g. H200) at
`tp 1`; scale `--tp` up if you need more KV-cache headroom for very long
context.

```bash
python3 -m sglang.launch_server --model-path ByteDance-Seed/Seed-OSS-36B-Instruct \
  --trust-remote-code \
  --tp 1
```

## Features

No dedicated SGLang reasoning or tool-call parser id is confirmed for Seed-OSS
yet (the native model PR is still open upstream). The model emits its
chain-of-thought inside `<seed:think>` blocks with `<seed:cot_budget_reflect>`
markers; control its length via `chat_template_kwargs: {"thinking_budget": 512}`
(multiples of 512; `0` for direct answers). Until a native parser lands, parse
those blocks client-side.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ByteDance-Seed/Seed-OSS-36B-Instruct",
    "messages": [{"role": "user", "content": "Explain quantum computing"}],
    "chat_template_kwargs": {"thinking_budget": 512},
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/ByteDance-Seed/Seed-OSS-36B-Instruct)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
