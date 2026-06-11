## Overview

TranslateGemma 27B IT is a lightweight open translation model from Google (based
on Gemma 3) supporting 55 languages. This guide covers serving the BF16
checkpoint with **SGLang**, which serves it via the Gemma3 multimodal path
(`gemma3_mm.py`).

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
  python3 -m sglang.launch_server --model-path google/translategemma-27b-it \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint fits on a single H200 GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path google/translategemma-27b-it \
  --trust-remote-code \
  --tp 1
```

## Features

This is a translation model — no chat tool-call or reasoning parser applies.
Prompt with the source text and the target language as documented on the model
card.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/translategemma-27b-it",
    "messages": [{"role": "user", "content": "Translate to French: Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/google/translategemma-27b-it)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
