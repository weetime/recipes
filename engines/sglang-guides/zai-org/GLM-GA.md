## Overview

GLM-GA is a dense (~10B) vision-language model based on the GLM-4.6V-Flash
architecture. It shares the `Glm4vForConditionalGeneration` model class with
GLM-4.6V, which SGLang serves natively (`glm4v.py`), so it runs on the standard
`python3 -m sglang.launch_server` LLM/VLM path. GLM-GA adds a dedicated video
processor that samples at a fixed 2 fps and supports up to 640 frames for
long-video understanding, with a 128K context window.

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-GA \
  --trust-remote-code --tp 1 \
  --tool-call-parser glm45 --reasoning-parser glm45
```

## Launching the server

The BF16 checkpoint (~22 GB) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-GA \
  --trust-remote-code \
  --tp 1 \
  --tool-call-parser glm45 \
  --reasoning-parser glm45
```

## Features

- **Tool calling:** `--tool-call-parser glm45`
- **Reasoning (thinking mode):** `--reasoning-parser glm45` — the GLM-4.5/4.6
  family shares this parser id in SGLang.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/GLM-GA",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-GA)
- [SGLang model support tracking (Glm4vForConditionalGeneration: glm4v.py)](https://github.com/sgl-project/sglang/issues/18458)
- [SGLang GLM-4.5/4.6/4.7 usage docs (glm45 parsers)](https://docs.sglang.io/basic_usage/glm45.html)
- [SGLang docs](https://docs.sglang.ai)
