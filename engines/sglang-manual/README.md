# Hand-authored SGLang blocks

Drop-in SGLang engine blocks for models the upstream **sgl-cookbook** snapshot
doesn't cover yet. This is the manual escape hatch alongside the generated
`engines/sglang/` tree.

## Why this exists

`engines/sglang/<org>/<repo>.yaml` is **generated** by `scripts/sync-sglang.mjs`
from the vendored upstream snapshot, and that script **wipes and rebuilds the
whole `engines/sglang/` tree on every run** — so anything you hand-write there is
lost on the next `pnpm sync:sglang`. Files here, in `engines/sglang-manual/`, are
never touched by the sync, so they survive re-syncs.

## Resolution order (generated wins)

`attachEngines()` (`src/lib/engines/sglang-join.js`) resolves a model's SGLang
block as:

1. `engines/sglang/<hf_id>.yaml` — generated; authoritative when present.
2. `engines/sglang-manual/<hf_id>.yaml` — used only when there's no generated block.

When upstream starts covering a model you authored manually, its generated block
**supersedes** the manual one. Delete the now-redundant manual file at that point.

## How to add a manual block

1. Create `engines/sglang-manual/<org>/<repo>.yaml`. The `<org>/<repo>` must match
   the recipe's `hf_id` (i.e. its path under `models/`). Mirror the generated
   schema:

   ```yaml
   engine: sglang
   model_id: <org>/<repo>
   min_version: v0.5.x                       # minimum SGLang version
   serve_binary: python3 -m sglang.launch_server
   base_args:
     - '--trust-remote-code'                 # if the model needs it
   tp_by_hardware:                           # per-hardware tensor-parallel size
     h200: 8
     b200: 8
   variants:
     default:
       precision: fp8                        # the checkpoint's real precision
   strategies:
     single_node_tp: {}                      # multi-node TP is derived at render
   features:                                 # only flags SGLang actually accepts
     tool_calling:
       args: ['--tool-call-parser', '<parser>']
     reasoning:
       args: ['--reasoning-parser', '<parser>']
   ```

   Ground the flags in **SGLang's** CLI (parser names can differ from vLLM's —
   e.g. SGLang `nemotron_3` vs vLLM `nemotron_v3`). Don't copy vLLM-only flags.

2. Optionally author a guide at `engines/sglang-guides/<org>/<repo>.md`.

3. Rebuild + rebaseline + test:

   ```bash
   node scripts/build-recipes-api.mjs
   node scripts/snapshot-api.mjs --write
   node --test
   ```
