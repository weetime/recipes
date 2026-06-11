## Overview

DeepSeek-OCR-2 is the next-generation ~3B-parameter vision-language OCR model,
iterating on DeepSeek-OCR with improved document-to-markdown grounding and optical
context compression. This guide covers serving the BF16 checkpoint with **SGLang**.
It is an OCR VLM, so no tool-calling or reasoning parser applies.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).
- A single GPU with ≥8 GB VRAM is sufficient for BF16 inference.
- **Known issue:** SGLang has an **open accuracy bug for DeepSeek-OCR-2**
  ([sgl-project/sglang#18358](https://github.com/sgl-project/sglang/issues/18358)) —
  OCR output may be degraded relative to the reference implementation. Track that
  issue before relying on SGLang for production OCR-2 workloads.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-OCR-2 \
  --trust-remote-code --tp 1
```

## Launching the server

The BF16 checkpoint (~3B params) fits on a single GPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path deepseek-ai/DeepSeek-OCR-2 \
  --trust-remote-code \
  --tp 1
```

## Features

This is an OCR vision-language model — there is no tool-calling or reasoning
parser. Send images via the OpenAI-compatible `image_url` content type with a
grounding prompt (e.g. `<|grounding|>Convert the document to markdown.`).

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/DeepSeek-OCR-2",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://upload.wikimedia.org/wikipedia/commons/3/3a/A_text_document.png"}},
      {"type": "text", "text": "Free OCR."}
    ]}],
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/deepseek-ai/DeepSeek-OCR-2)
- [SGLang accuracy bug #18358](https://github.com/sgl-project/sglang/issues/18358)
- [SGLang docs](https://docs.sglang.ai)
