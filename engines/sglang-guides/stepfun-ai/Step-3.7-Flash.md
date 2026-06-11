## Overview

Step-3.7-Flash is StepFun's production-grade vision-language Mixture-of-Experts
model (~198B total / ~11B active) pairing a 196B sparse language backbone with a
1.8B perception encoder, hybrid SWA/Global attention (3:1), and 3-way
Multi-Token Prediction. This guide covers serving the BF16 checkpoint with
**SGLang**, which supports the model through its native `step3p7.py`
implementation.

## Prerequisites

- **SGLang:** 0.5.6 or newer (a recent build is recommended — this is a new
  architecture).
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
  python3 -m sglang.launch_server --model-path stepfun-ai/Step-3.7-Flash \
  --trust-remote-code --tp 4
```

## Launching the server

The BF16 checkpoint (~436 GB of weights) needs roughly four GPUs of sharding.
Serve at `tp 4` on a single node of 8×H200 or 8×B200 (use the remaining GPUs for
KV cache, or raise `--tp` for more headroom on long context).

```bash
python3 -m sglang.launch_server --model-path stepfun-ai/Step-3.7-Flash \
  --trust-remote-code \
  --tp 4
```

## Features

No SGLang tool-call or reasoning parser id is confirmed for Step-3.7-Flash yet,
so none is wired into this block. The model is a vision-language MoE: send image
inputs in the `image_url` message field. If you need its reasoning or tool-call
output structured, parse it client-side until a native SGLang parser lands.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "stepfun-ai/Step-3.7-Flash",
    "messages": [{"role": "user", "content": [
      {"type": "image_url", "image_url": {"url": "https://.../image.png"}},
      {"type": "text", "text": "Describe this image."}
    ]}],
    "max_tokens": 256
  }'
```

## References

- [Model card](https://huggingface.co/stepfun-ai/Step-3.7-Flash)
- [SGLang support matrix research (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
