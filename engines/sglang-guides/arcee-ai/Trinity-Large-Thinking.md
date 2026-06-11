## Overview

Trinity-Large-Thinking is Arcee AI's reasoning-focused sparse Mixture-of-Experts
model (398B total / 13B active, `AfmoeForCausalLM`) designed for long-horizon
planning, agentic tool use, and multi-step workflows. It emits explicit reasoning
traces inside `<think>...</think>` blocks. This guide covers serving the BF16
checkpoint with **SGLang**.

> **Parser names are inferred.** The HF model card documents `sglang.launch_server`
> but does not publish the tool-call / reasoning parser ids. The flags below are
> carried over from the vLLM recipe (tool `qwen3_coder`, reasoning `deepseek_r1`)
> and mapped to SGLang's naming (`deepseek-r1`). Verify them against your SGLang
> build before relying on structured tool/reasoning output.

## Prerequisites

- **SGLang:** 0.5.6 or newer.
- `--trust-remote-code` is required (the model ships custom modeling code).
- Multi-GPU is recommended — the BF16 checkpoint is large.

## Install

```bash
python3 -m pip install "sglang[all]>=0.5.6"
```

Or use the SGLang Docker image:

```bash
docker run --gpus all --ipc=host -p 30000:30000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  lmsysorg/sglang:latest \
  python3 -m sglang.launch_server --model-path arcee-ai/Trinity-Large-Thinking \
  --trust-remote-code --tp 8 \
  --tool-call-parser qwen3_coder --reasoning-parser deepseek-r1
```

## Launching the server

The BF16 checkpoint fits on a single 8×H200 or 8×B200 node at `tp 8`.

```bash
python3 -m sglang.launch_server --model-path arcee-ai/Trinity-Large-Thinking \
  --trust-remote-code \
  --tp 8 \
  --tool-call-parser qwen3_coder \
  --reasoning-parser deepseek-r1
```

## Features

- **Tool calling:** `--tool-call-parser qwen3_coder` *(inferred — verify)*
- **Reasoning (thinking mode):** `--reasoning-parser deepseek-r1` *(inferred —
  verify)*. Extracts `<think>...</think>` into the response's reasoning field;
  preserve reasoning across turns in agentic loops.

## Verify

```bash
curl http://localhost:30000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "arcee-ai/Trinity-Large-Thinking",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 32
  }'
```

## References

- [Model card](https://huggingface.co/arcee-ai/Trinity-Large-Thinking)
- [SGLang docs](https://docs.sglang.ai)
