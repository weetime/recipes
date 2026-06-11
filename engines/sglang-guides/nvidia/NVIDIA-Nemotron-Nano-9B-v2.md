## Overview

Nemotron-Nano-9B-v2 is a 9B hybrid-Mamba dense reasoning model with tool use.
This guide covers serving the native BF16 checkpoint with **SGLang** via
`python3 -m sglang.launch_server`.

## Prerequisites

- **SGLang:** 0.5.10 or newer. Prefer a current tagged release; fall back to a
  **nightly / dev image** if a tagged build doesn't yet recognize the
  architecture.
- `--trust-remote-code` is required (the model ships custom modeling code).
- As a hybrid-Mamba model it relies on Mamba SSM kernels; install `mamba-ssm`
  if your image doesn't already bundle them:

  ```bash
  python3 -m pip install mamba-ssm
  ```
- The Mamba state cache is preallocated; on long contexts you can cap it with
  `--max-mamba-cache-size`.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
python3 -m pip install mamba-ssm
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
  --trust-remote-code --tp 1 \
  --reasoning-parser nemotron_3
```

## Launching the server

The BF16 checkpoint (~20 GB) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
  --trust-remote-code \
  --tp 1 \
  --reasoning-parser nemotron_3
```

## Features

- **Reasoning (thinking mode):** `--reasoning-parser nemotron_3` — note SGLang's
  parser id is `nemotron_3`, distinct from vLLM's `nano_v3` / `nemotron_v3`.
- Tool calling is exposed by the model (vLLM uses a custom `nemotron_json`
  plugin), but SGLang's tool-call parser for this family is not yet confirmed,
  so it is omitted here.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2)
- [SGLang support matrix (recipes issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
