## Overview

Mistral-Large-3-675B-Instruct-2512 is Mistral's flagship 675B Mixture-of-Experts
model (~22B active per token) with a ~295K context window. **SGLang** serves it
through a dedicated `mistral_large_3.py` implementation, with NVFP4 support on
Blackwell.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (dedicated `mistral_large_3` architecture).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path mistralai/Mistral-Large-3-675B-Instruct-2512 \
  --trust-remote-code --tp 8 \
  --tool-call-parser mistral --reasoning-parser mistral
```

## Launching the server

The FP8 checkpoint (~742 GB) fits a single 8×B200 node at `tp 8`.

```bash
python3 -m sglang.launch_server --model-path mistralai/Mistral-Large-3-675B-Instruct-2512 \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser mistral \
  --reasoning-parser mistral
```

The FP8 weights also fit a single 8×H200 node (1128 GB) at `tp 8`, though leaving
context headroom there is tight — prefer the NVFP4 checkpoint
(`mistralai/Mistral-Large-3-675B-Instruct-2512-NVFP4`, ~405 GB) on Blackwell, or
scale to multiple nodes for full-context serving.

## Features

- **Tool calling:** `--tool-call-parser mistral`
- **Reasoning (thinking mode):** `--reasoning-parser mistral`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-Large-3-675B-Instruct-2512",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/mistralai/Mistral-Large-3-675B-Instruct-2512)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
