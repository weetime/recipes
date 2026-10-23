import test from "node:test";
import assert from "node:assert/strict";
import { resolveOmniTasks } from "./omni-tasks.js";

test("variant-specific Omni curl follows the selected checkpoint and payload", () => {
  const recipe = {
    model: { model_id: "Qwen/CustomVoice" },
    omni: {
      tasks: [{
        id: "t2a",
        curl: '{"model":"{{model_id}}","voice":"vivian"}',
        curl_by_variant: {
          base: '{"model":"{{model_id}}","task_type":"Base","ref_audio":"/sample.wav"}',
        },
      }],
    },
  };

  const defaultTask = resolveOmniTasks(recipe)[0];
  assert.equal(defaultTask.example({ modelId: "Qwen/CustomVoice" }),
    '{"model":"Qwen/CustomVoice","voice":"vivian"}');

  const baseTask = resolveOmniTasks(recipe, "base")[0];
  assert.equal(baseTask.example({ modelId: "Qwen/Base" }),
    '{"model":"Qwen/Base","task_type":"Base","ref_audio":"/sample.wav"}');
});
