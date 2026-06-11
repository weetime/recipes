## Overview

Nemotron-3-Nano-Omni-30B-A3B-Reasoning is a Mamba2-Transformer hybrid MoE
omnimodal model (31B total / 3B active) that unifies video, audio, image, and
text understanding, with chain-of-thought reasoning and tool calling. This guide
covers serving the native BF16 checkpoint with **SGLang** via
`python3 -m sglang.launch_server`.

## Prerequisites

- **SGLang:** 0.5.10 or newer. This is a very recent omni model — use a
  **nightly / dev SGLang image** (e.g. the `lmsysorg/sglang` nightly tag) or a
  source build until omni support lands in a tagged release.
- `--trust-remote-code` is required (the model ships custom modeling code).
- **Audio dependency:** install `librosa` for audio (and `use_audio_in_video`)
  inputs:

  ```bash
  python3 -m pip install librosa
  ```
- As a hybrid-Mamba model it allocates a fixed Mamba state cache; if you hit OOM
  on long contexts, cap it with `--max-mamba-cache-size`.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10"
python3 -m pip install librosa
```

Or use the SGLang nightly/dev Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server \
  --model-path nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16 \
  --trust-remote-code --tp 1 \
  --reasoning-parser nemotron_3
```

## Launching the server

The BF16 checkpoint (~68 GB) fits on a single H200 or B200 at `tp 1`.

```bash
python3 -m sglang.launch_server \
  --model-path nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16 \
  --trust-remote-code \
  --tp 1 \
  --reasoning-parser nemotron_3
```

If you serve long contexts and hit OOM from the Mamba state cache, add e.g.
`--max-mamba-cache-size 512`.

## Features

- **Reasoning (thinking mode):** `--reasoning-parser nemotron_3` — note SGLang's
  parser id is `nemotron_3`, distinct from vLLM's `nemotron_v3`.
- Tool calling is exposed by the model but SGLang's tool-call parser for this
  family is not yet confirmed, so it is omitted here.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16)
- [SGLang support matrix (recipes issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
