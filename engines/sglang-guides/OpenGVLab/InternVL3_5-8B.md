## Overview

InternVL3.5-8B is an 8B vision-language model from Shanghai AI Lab (OpenGVLab)
with optional thinking-mode prompting. This guide covers serving the BF16
checkpoint with **SGLang**, which implements the model natively (`internvl.py`).

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
  python3 -m sglang.launch_server --model-path OpenGVLab/InternVL3_5-8B \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint fits on a single H100 (or AMD MI300X/MI325X/MI355X) GPU at
`tp 1`.

```bash
python3 -m sglang.launch_server --model-path OpenGVLab/InternVL3_5-8B \
  --trust-remote-code \
  --tp 1
```

## Features

- **Vision:** single- and multi-image prompts via OpenAI-compatible `image_url`
  content blocks.
- **Thinking mode:** enabled via a custom system prompt (see the model card) —
  no dedicated parser flag.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "OpenGVLab/InternVL3_5-8B",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/OpenGVLab/InternVL3_5-8B)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
