## Overview

Phi-4-mini-instruct is Microsoft's 4B dense instruction-tuned model
(`Phi3ForCausalLM` architecture) with a 128K context window. **SGLang** serves it
natively via `phi.py` and it fits on a single GPU at BF16.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is recommended (Phi ships custom config/modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path microsoft/Phi-4-mini-instruct \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~9 GB) fits on a single H100 GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path microsoft/Phi-4-mini-instruct \
  --trust-remote-code \
  --tp 1
```

## Features

Phi-4-mini-instruct has no dedicated SGLang tool-call or reasoning parser; serve
it as a plain chat model. Tool-call output, if any, is returned as raw text.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "microsoft/Phi-4-mini-instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/microsoft/Phi-4-mini-instruct)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
