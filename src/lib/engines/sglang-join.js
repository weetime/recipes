import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const SGLANG_DIR = path.join(process.cwd(), "engines", "sglang");

/**
 * If an SGLang engine block exists at engines/sglang/<hf_id>.yaml, attach an
 * `engines` map + `default_engine` to the recipe (mutates and returns it).
 *
 * IMPORTANT: engines.vllm is a lightweight descriptor ({ min_version }), NOT the
 * recipe object — CommandBuilder serializes `recipe` for client hydration, and a
 * self-reference would be a circular-JSON crash. vLLM synthesis still reads the
 * recipe's top-level fields; only SGLang reads engines.sglang.
 *
 * @param {any} recipe  parsed recipe carrying `hf_id`
 * @returns {any} the same recipe, possibly with `engines`/`default_engine`
 */
export function attachEngines(recipe) {
  const hfId = recipe?.hf_id;
  if (!hfId) return recipe;
  const blockPath = path.join(SGLANG_DIR, `${hfId}.yaml`);
  if (!fs.existsSync(blockPath)) return recipe;
  const block = yaml.load(fs.readFileSync(blockPath, "utf8"));
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
  recipe.default_engine = "vllm";
  return recipe;
}
