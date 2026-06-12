## Overview

Llama-3.1-8B-Instruct is Meta's 8B dense instruction-tuned language model with a
128K context window. It is a core, well-supported architecture in **SGLang** and
runs comfortably on a single GPU at BF16.

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
  python3 -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct \
  --tp 1 --tool-call-parser llama3_json
```

## Huawei Ascend NPU

SGLang's in-tree Ascend NPU backend has verified Llama-3.1-8B. Use the Ascend
Docker image and CANN stack instead of the CUDA wheel:

```bash
docker run --rm -it --network host \
  --device /dev/davinci0 --device /dev/davinci_manager --device /dev/hisi_hdc \
  -v /usr/local/Ascend/driver:/usr/local/Ascend/driver \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest-cann8.5.0-910b \
  python3 -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct \
  --tp 1 --tool-call-parser llama3_json
```

Requires CANN 8.5.0 + torch-npu 2.8 (bundled in the `-cann8.5.0-910b` image; use
the `-a3` variant for 910C). See [SGLang Ascend docs](https://github.com/sgl-project/sglang/blob/main/docs/platforms/ascend/ascend_npu.md).

## Launching the server

The BF16 checkpoint (~16 GB) fits on a single H100, H200, or Ascend NPU at `tp 1`.

```bash
python3 -m sglang.launch_server --model-path meta-llama/Llama-3.1-8B-Instruct \
  --tp 1 \
  --tool-call-parser llama3_json
```

## Features

- **Tool calling:** `--tool-call-parser llama3_json`

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct)
- [SGLang support matrix (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
