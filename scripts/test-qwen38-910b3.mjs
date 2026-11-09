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
  const result = command(['reasoning', 'spec_decoding']);
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
  const result = command(['reasoning']);
  assert.ok(!result.argv.includes('--speculative-config'));
  for (const mode of ['mtp', 'dflash', 'dspark']) assert.equal(isModeSupported(recipe.features.spec_decoding.modes[mode], profile, 'ascend_910b'), false);
});
