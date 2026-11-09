import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import yaml from 'js-yaml';
import { computeDockerMeta, isModeSupported, resolveCommand } from '../src/lib/command-synthesis.js';
import { loadStrategies } from '../src/lib/strategies.js';
import { loadTaxonomy } from '../src/lib/taxonomy.js';

const recipe = yaml.load(fs.readFileSync('models/Qwen/Qwen3.8-27B.yaml', 'utf8'));
const taxonomy = loadTaxonomy();
const strategies = loadStrategies();
const profile = taxonomy.hardware_profiles.ascend_910b;
const flag = (argv, name) => argv[argv.indexOf(name) + 1];
const command = (features) => resolveCommand(recipe, 'ascend_w8a8', 'single_node_tp', 'ascend_910b', features, strategies, taxonomy, [], 1, null, { spec_decoding: 'qwen3_5_mtp' }, null, null, 'python');

test('910B W8A8 selects the MRV2 TP2 configuration and pinned image', () => {
  assert.equal(recipe.meta.hardware.ascend_910b, 'supported');
  const result = command(['reasoning', 'spec_decoding', 'mrv2']);
  assert.equal(result.argv[2], 'Eco-Tech/Qwen3.8-27B-w8a8');
  assert.equal(flag(result.argv, '--tensor-parallel-size'), '2');
  assert.equal(flag(result.argv, '--quantization'), 'ascend');
  assert.equal(flag(result.argv, '--max-model-len'), '133120');
  assert.equal(result.env.VLLM_USE_V2_MODEL_RUNNER, '1');
  assert.equal(result.env.VLLM_USE_MODELSCOPE, 'True');
  assert.deepEqual(JSON.parse(flag(result.argv, '--speculative-config')), { method: 'qwen3_5_mtp', num_speculative_tokens: 3 });
  assert.equal(computeDockerMeta(recipe, recipe.variants.ascend_w8a8, profile, 'ascend_910b').image, 'quay.io/ascend/vllm-ascend@sha256:28351d337b7f9367073344240fa4e28d99794d549d577eaf317689950064150a');
});

test('ordinary decoding turns off MTP; unsafe vLLM drafts are unavailable on 910B', () => {
  const result = command(['reasoning', 'mrv2']);
  assert.ok(!result.argv.includes('--speculative-config'));
  assert.equal(result.env.VLLM_USE_V2_MODEL_RUNNER, '1');
  assert.equal(command(['reasoning']).env.VLLM_USE_V2_MODEL_RUNNER, '0');
  for (const mode of ['mtp', 'dflash', 'dspark']) assert.equal(isModeSupported(recipe.features.spec_decoding.modes[mode], profile, 'ascend_910b'), false);
});

test('SGLang 910B uses its own checkpoint, engine flags, image and optional draft', async () => {
  const { attachEngines } = await import('../src/lib/engines/sglang-join.js');
  const { resolveCommandForEngine } = await import('../src/lib/engines/index.js');
  const assembled = attachEngines({ ...recipe, hf_id: 'Qwen/Qwen3.8-27B' });
  const make = (variant, features) => resolveCommandForEngine('sglang', assembled, variant, 'single_node_tp', 'ascend_910b', features, strategies, taxonomy, [], 1, null);
  for (const key of ['default', 'ascend_w8a8']) {
    const plain = make(key, []);
    assert.equal(plain.tp, 2);
    assert.equal(plain.port, 8000);
    assert.equal(flag(plain.argv, '--attention-backend'), 'ascend');
    assert.ok(plain.argv.includes('--disable-radix-cache'));
    assert.ok(!plain.argv.includes('--kv-cache-dtype'));
    assert.ok(!plain.argv.includes('--speculative-algorithm'));
    assert.ok(!plain.env.VLLM_USE_V2_MODEL_RUNNER);
    const draft = make(key, ['dflash']);
    assert.equal(flag(draft.argv, '--speculative-algorithm'), 'DFLASH');
    assert.equal(flag(draft.argv, '--speculative-draft-model-path'), '/models/Qwen3.8-27B-DFlash2');
    assert.equal(flag(draft.argv, '--speculative-num-draft-tokens'), '8');
    assert.equal(draft.argv.includes('--speculative-draft-model-quantization'), key === 'ascend_w8a8');
  }
  const w8 = make('ascend_w8a8', ['dflash']);
  assert.equal(flag(w8.argv, '--model-path'), 'Eco-Tech/Qwen3.8-27B-w8a8');
  assert.equal(flag(w8.argv, '--quantization'), 'modelslim');
  assert.equal(w8.env.SGLANG_USE_MODELSCOPE, 'True');
  assert.match(computeDockerMeta(recipe, assembled.engines.sglang.variants.ascend_w8a8, profile, 'ascend_910b').image, /sglang:0\.5\.20-w8a8-dflash2/);
  assert.match(assembled.engines.sglang.guide, /SGLang on Ascend 910B3/);
});

test('910B YaRN feature keeps the W8A8 checkpoint and switches to MRV1 TP4', () => {
  const result = resolveCommand(recipe, 'ascend_w8a8', 'single_node_tp', 'ascend_910b', ['long_context', 'mrv2', 'reasoning', 'spec_decoding'], strategies, taxonomy, [], 1, null, { spec_decoding: 'qwen3_5_mtp' }, null, null, 'python');
  assert.equal(result.argv[2], 'Eco-Tech/Qwen3.8-27B-w8a8');
  assert.equal(flag(result.argv, '--tensor-parallel-size'), '4');
  assert.equal(flag(result.argv, '--max-model-len'), '1000000');
  assert.equal(result.env.VLLM_USE_V2_MODEL_RUNNER, '0');
  assert.equal(JSON.parse(flag(result.argv, '--speculative-config')).max_model_len, 1000000);
  assert.equal(recipe.features.long_context.hardware_overrides.ascend_910b.docker_image, 'swr.cn-north-4.myhuaweicloud.com/runner/qwen38-b3-vllm:0.27.1-longctx-20261109-r2');
  const withoutMtp = resolveCommand(recipe, 'ascend_w8a8', 'single_node_tp', 'ascend_910b', ['long_context'], strategies, taxonomy, [], 1, null, {}, null, null, 'python');
  assert.ok(!withoutMtp.argv.includes('--speculative-config'));
  const bf16 = resolveCommand(recipe, 'default', 'single_node_tp', 'ascend_910b', ['long_context'], strategies, taxonomy, [], 1, null, {}, null, null, 'python');
  assert.notEqual(flag(bf16.argv, '--max-model-len'), '1000000');
});
