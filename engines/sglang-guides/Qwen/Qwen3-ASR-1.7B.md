## Overview

Qwen3-ASR-1.7B is a compact speech-to-text model supporting 11 languages,
multiple accents, and singing voice. This guide covers serving it with
**SGLang** via the `launch_server` audio path; transcription requests go to the
OpenAI-compatible `/v1/audio/transcriptions` endpoint.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (custom modeling code).
- Audio extras (`librosa`, `soundfile`) for input pre-processing.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
python3 -m pip install librosa soundfile
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path Qwen/Qwen3-ASR-1.7B \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~5 GB weights) fits comfortably on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path Qwen/Qwen3-ASR-1.7B \
  --trust-remote-code \
  --tp 1
```

## Features

This is a transcription-only model — no chat tool-calling or reasoning parsers
apply. Send audio to the transcription endpoint.

## Verify

```bash
curl http://localhost:30000/v1/audio/transcriptions \
  -F "model=Qwen/Qwen3-ASR-1.7B" \
  -F "file=@sample.wav"
```

## References

- [Model card](https://huggingface.co/Qwen/Qwen3-ASR-1.7B)
- [SGLang support matrix / issue #13](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
