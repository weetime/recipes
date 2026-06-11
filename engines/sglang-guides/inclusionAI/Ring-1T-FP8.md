## Overview

Ring-1T-FP8 is a 1T-parameter Mixture-of-Experts reasoning model (50B active
per token) from inclusionAI's Bailing family, shipped as a native FP8
checkpoint. This guide covers serving it with **SGLang** via
`sglang.launch_server`.

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
  python3 -m sglang.launch_server --model-path inclusionAI/Ring-1T-FP8 \
  --trust-remote-code --tp 8
```

## Launching the server

At ~1 TB the FP8 checkpoint exceeds a single 8×H200 node, so it is served
multi-node. Each node runs `tp 8`; the command builder derives the multi-node
launch (`--nnodes` / `--node-rank` / `--dist-init-addr`) from that base. AMD
MI300X / MI325X run `tp 8` per node.

```bash
python3 -m sglang.launch_server --model-path inclusionAI/Ring-1T-FP8 \
  --trust-remote-code \
  --tp 8
```

## Features

Ring-1T is a thinking model. SGLang's tool-call and reasoning parser names for
this model were not confirmed in the support research (issue #13), so no parser
flags are emitted by default. The model emits its reasoning trace inline; once a
parser is confirmed upstream, add `--reasoning-parser <name>` here.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inclusionAI/Ring-1T-FP8",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/inclusionAI/Ring-1T-FP8)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
