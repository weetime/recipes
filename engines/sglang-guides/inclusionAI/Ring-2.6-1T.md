## Overview

Ring-2.6-1T is a 1T-parameter Mixture-of-Experts thinking model (50B active per
token) from inclusionAI's Bailing family (BailingMoeV2_5, hybrid linear + MLA
attention), shipped as a native FP8 checkpoint with a 128K context. This guide
covers serving it with **SGLang** via `sglang.launch_server`.

## Prerequisites

- **SGLang:** 0.5.10.post1 or newer. SGLang support is documented on the
  cookbook page with upstreaming in progress, so prefer a recent release (or the
  nightly Docker image if you hit a missing-architecture error).
- `--trust-remote-code` is required (the model ships custom modeling code).

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.10.post1"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path inclusionAI/Ring-2.6-1T \
  --trust-remote-code --tp 8
```

## Launching the server

At ~1 TB the FP8 checkpoint is served multi-node. Each node runs `tp 8`; the
command builder derives the multi-node launch
(`--nnodes` / `--node-rank` / `--dist-init-addr`) from that base. AMD MI300X
runs `tp 8` per node.

```bash
python3 -m sglang.launch_server --model-path inclusionAI/Ring-2.6-1T \
  --trust-remote-code \
  --tp 8
```

## Features

Ring-2.6-1T is a thinking model. SGLang's tool-call and reasoning parser names
for this model were not confirmed in the support research (issue #13), so no
parser flags are emitted by default. Once a parser is confirmed upstream, add
`--reasoning-parser <name>` here.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "inclusionAI/Ring-2.6-1T",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/inclusionAI/Ring-2.6-1T)
- [SGLang support tracking (issue #13)](https://github.com/weetime/recipes/issues/13)
- [SGLang docs](https://docs.sglang.ai)
