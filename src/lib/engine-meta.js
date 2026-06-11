// Display metadata for inference engines — the single source of truth for an
// engine's human label and logo. Keep this in sync with the engine adapters in
// src/lib/engines/ (which hold the *behavior*); this module holds the *chrome*.
//
// Adding a new engine (e.g. TEI) is two steps:
//   1. drop a small square-ish logo at public/engine-logos/<id>.png
//   2. add an entry here
// Everything that shows an engine (sidebar badges, the CommandBuilder Engine
// pill, the guide header) reads from here, so it picks the new engine up.

export const ENGINE_META = {
  vllm:   { label: "vLLM",   logo: "/engine-logos/vllm.png" },
  sglang: { label: "SGLang", logo: "/engine-logos/sglang.png" },
  // tei:  { label: "TEI",    logo: "/engine-logos/tei.png" },
};

// Fallback so an unknown/new engine id still renders a sensible label and no
// broken <img> (logo null → callers skip the image and show the label).
export function getEngineMeta(id) {
  return (
    ENGINE_META[id] || {
      label: id ? id.charAt(0).toUpperCase() + id.slice(1) : "",
      logo: null,
    }
  );
}

// The engines a recipe supports, in display order (vLLM is the baseline for
// every recipe; others come from the attached `engines` map). Mirrors
// engineList() in engine-ui.js but is safe to call with a trimmed recipe.
export function recipeEngineIds(recipe) {
  // vLLM is the baseline for every recipe; pin it first regardless of the
  // engines map's key order, then append the rest.
  const ids = recipe?.engines ? Object.keys(recipe.engines).filter((id) => id !== "vllm") : [];
  return ["vllm", ...ids];
}
