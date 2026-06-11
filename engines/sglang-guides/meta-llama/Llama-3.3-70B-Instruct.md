## Overview

Llama-3.3-70B-Instruct is Meta's 70B dense instruction-tuned language model with
a 128K context window. It is a core architecture in **SGLang** and serves on a
single Hopper or Blackwell node at BF16.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- No `--trust-remote-code` needed — Llama is a built-in architecture.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path meta-llama/Llama-3.3-70B-Instruct \
  --tp 2 --tool-call-parser llama3_json
```

## Launching the server

The BF16 checkpoint (~154 GB) needs `tp 2` on an H100/H200 node (141 GB/GPU on
H200) and fits at `tp 1` on a B200/GB200 GPU (180–192 GB).

```bash
python3 -m sglang.launch_server --model-path meta-llama/Llama-3.3-70B-Instruct \
  --tp 2 \
  --tool-call-parser llama3_json
```

On B200 / GB200, drop to `--tp 1`.

## Features

- **Tool calling:** `--tool-call-parser llama3_json`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.3-70B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
