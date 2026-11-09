# SGLang on Ascend 910B3

These are separate experimental configurations. Select Ascend 910B and the corresponding BF16 or W8A8 variant above. The DFlash2 K8 option uses an external draft and disables radix caching because partial prefix reuse changed tool arguments in a test. Verify draft revision, quantized weight loading and task quality before use. The public W8A8 checkpoint has not been verified byte-for-byte against the locally tested weights.

#### 4. SGLang BF16, DFlash2 K8

Image: `lmsysorg/sglang:v0.5.20-cann9.0.0-910b`.
TP2 with an external BF16 draft and prefix caching disabled. A small mathematics sample showed acceleration; business quality remains unassessed.

```bash
export MODEL=/models/Qwen3.8-27B-BF16
export DRAFT=/models/Qwen3.8-27B-DFlash2
export ASCEND_RT_VISIBLE_DEVICES=0,1

python3 -m sglang.launch_server \
  --model-path "$MODEL" --served-model-name qwen38 \
  --host 0.0.0.0 --port 8000 --tp-size 2 \
  --attention-backend ascend --mamba-ssm-dtype bfloat16 \
  --mamba-radix-cache-strategy extra_buffer --disable-radix-cache \
  --mem-fraction-static 0.85 --context-length 40960 \
  --max-running-requests 16 \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path "$DRAFT" \
  --speculative-num-draft-tokens 8
```

#### 5. SGLang W8A8, DFlash2 K8

Image: `swr.cn-north-4.myhuaweicloud.com/runner/qwen38-b3-sglang:0.5.20-w8a8-dflash2-20261109`.
Experimental patched image, reported digest `sha256:f011c132f8708c01db7478ea7440348ccad6feb38545aa4d5e115a7d8c11fdec`. It requires a separate BF16 draft; check image access, quantized layer loading and task quality.

```bash
export MODEL=/models/Qwen3.8-27B-w8a8
export DRAFT=/models/Qwen3.8-27B-DFlash2
export ASCEND_RT_VISIBLE_DEVICES=0,1

python3 -m sglang.launch_server \
  --model-path "$MODEL" --served-model-name qwen38 \
  --host 0.0.0.0 --port 8000 --tp-size 2 \
  --attention-backend ascend --mamba-ssm-dtype bfloat16 \
  --mamba-radix-cache-strategy extra_buffer --disable-radix-cache \
  --mem-fraction-static 0.85 --context-length 40960 \
  --max-running-requests 16 --quantization modelslim \
  --speculative-algorithm DFLASH \
  --speculative-draft-model-path "$DRAFT" \
  --speculative-num-draft-tokens 8 \
  --speculative-draft-model-quantization unquant
```

Earlier offline work used [z-lab/Qwen3.8-27B-DFlash2](https://huggingface.co/z-lab/Qwen3.8-27B-DFlash2) revision `50307d4c4cde6860d4eee73e2547cd786fe8e8a4`; the November 9 startup record does not independently establish the mounted draft revision.
