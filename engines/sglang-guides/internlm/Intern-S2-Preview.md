## Overview

Intern-S2-Preview is a scientific multimodal Mixture-of-Experts model (36B total
/ 3B active) from InternLM, continued-pretrained from Qwen3.5 with hybrid
linear/full attention and a 262K context. This guide covers serving the BF16
checkpoint with **SGLang**, which implements the model natively
(`interns2preview.py`).

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
  python3 -m sglang.launch_server --model-path internlm/Intern-S2-Preview \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint fits on a single H200 (or GB200) GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path internlm/Intern-S2-Preview \
  --trust-remote-code \
  --tp 1
```

## Features

- **Vision:** send images via OpenAI-compatible `image_url` content blocks.

Tool-calling / reasoning parser names for SGLang are not yet confirmed (issue
#13 records the native impl only; the vLLM recipe borrows `qwen3` / `qwen3_coder`
but these are unverified for SGLang) — verify against your SGLang build before
enabling them.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "internlm/Intern-S2-Preview",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/internlm/Intern-S2-Preview)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
