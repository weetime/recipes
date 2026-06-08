/**
 * Pick the guide markdown to render for the active engine, or null when that
 * engine has no guide (the caller renders a fallback). vLLM (and an absent
 * engine) uses the recipe's top-level `guide`; any other engine uses
 * `recipe.engines[engine].guide`. Pure — no React, no IO.
 */
export function pickGuide(engine, recipe) {
  if (!engine || engine === "vllm") return recipe?.guide || null;
  return recipe?.engines?.[engine]?.guide || null;
}
