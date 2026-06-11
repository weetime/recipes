## Overview

DiffusionGemma 26B-A4B is a block-diffusion language model built on Gemma 4's
MoE backbone (26B total / 4B active). Instead of left-to-right autoregressive
decoding, it generates 256-token canvas blocks via iterative denoising. SGLang
serves it through the standard `python3 -m sglang.launch_server` path as a
diffusion language model (alongside SDAR and LLaDA2) — this is the text-diffusion
LLM path, not the separate SGLang-Diffusion image stack. SGLang drives the
denoising with its `Gemma4Renoise` algorithm.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (the checkpoint ships its own modeling code).
- `--dllm-algorithm Gemma4Renoise` selects the renoising block-diffusion sampler.
  SGLang auto-selects the attention backend, eager mode, and unchunked prefill
  for this algorithm, so those do not need to be passed on the command line.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path google/diffusiongemma-26B-A4B-it \
  --trust-remote-code --dllm-algorithm Gemma4Renoise --tp 1
```

## Launching the server

The BF16 MoE checkpoint (~57 GB) fits on a single H200 at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path google/diffusiongemma-26B-A4B-it \
  --trust-remote-code \
  --dllm-algorithm Gemma4Renoise \
  --tp 1
```

## Features

No tool-calling or reasoning parser is configured for the SGLang diffusion path
in this block. The denoising sampler is fully driven by `--dllm-algorithm
Gemma4Renoise` (optionally tuned via `--dllm-algorithm-config`).

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/diffusiongemma-26B-A4B-it",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/google/diffusiongemma-26B-A4B-it)
- [SGLang supported diffusion language models (lists google/diffusiongemma-26B-A4B-it, Gemma4Renoise sampler)](https://github.com/sgl-project/sglang/blob/main/docs_new/docs/supported-models/diffusion_language_models.mdx)
- [SGLang docs](https://docs.sglang.ai)
