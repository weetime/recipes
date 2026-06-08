import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const SGLANG_DIR = path.join(process.cwd(), "engines", "sglang");
const SGLANG_GUIDES_DIR = path.join(process.cwd(), "engines", "sglang-guides");

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
  // Hand-authored SGLang guides live in a separate tree (sync-sglang.mjs never
  // writes there, so they survive upstream re-syncs). Merge onto the block when
  // present; absent leaves block.guide unset and the UI shows a fallback notice.
  const guidePath = path.join(SGLANG_GUIDES_DIR, `${hfId}.md`);
  if (fs.existsSync(guidePath) && block && typeof block === "object") {
    block.guide = fs.readFileSync(guidePath, "utf8");
  }
  recipe.engines = {
    vllm: { min_version: recipe.model?.min_vllm_version || null },
    sglang: block,
  };
  recipe.default_engine = "vllm";
  return recipe;
}
