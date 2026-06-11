## Overview

Nemotron-3-Nano-4B is the smallest member of the Nemotron-3 hybrid-Mamba family
— a compact (4B) dense model tuned for low-latency reasoning and tool use. This
guide covers serving the native BF16 checkpoint with **SGLang** via
`python3 -m sglang.launch_server`.

## Prerequisites

- **SGLang:** 0.5.10 or newer. This is a recent model — prefer a current tagged
  release or a **nightly / dev image** if a tagged build doesn't yet recognize
  the architecture.
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
  --model-path nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16 \
  --trust-remote-code --tp 1 \
  --reasoning-parser nemotron_3
```

## Launching the server

The BF16 checkpoint (~9 GB) fits comfortably on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16 \
  --trust-remote-code \
  --tp 1 \
  --reasoning-parser nemotron_3
```

## Features

- **Reasoning (thinking mode):** `--reasoning-parser nemotron_3` — note SGLang's
  parser id is `nemotron_3`. The HF card lists `nano_v3`, which is vLLM's name
  for the same parser.
- Tool calling is exposed by the model but SGLang's tool-call parser for this
  family is not yet confirmed, so it is omitted here.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16)
- [SGLang support matrix (recipes issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
