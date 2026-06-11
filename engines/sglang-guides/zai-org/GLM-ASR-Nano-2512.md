## Overview

GLM-ASR-Nano-2512 is a compact (2.3B total / 1.5B active) automatic speech
recognition model from Z-AI with strong dialect support (Cantonese and others)
and robust low-volume speech transcription. This guide covers serving it with
**SGLang**, which implements the model natively (`glmasr.py`).

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
  python3 -m sglang.launch_server --model-path zai-org/GLM-ASR-Nano-2512 \
  --trust-remote-code --tp 1
```

## Launching the server

This compact model runs on a single H200 GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path zai-org/GLM-ASR-Nano-2512 \
  --trust-remote-code \
  --tp 1
```

## Features

This is a speech-recognition model — no chat tool-call or reasoning parser
applies. Transcribe audio via the OpenAI-compatible audio endpoint.

## Verify

```bash
curl http://localhost:30000/v1/audio/transcriptions \
  -F "model=zai-org/GLM-ASR-Nano-2512" \
  -F "file=@sample.wav"
```

## References

- [Model card](https://huggingface.co/zai-org/GLM-ASR-Nano-2512)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
