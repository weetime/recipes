"use client";

import { useSearchParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { pickGuide } from "@/lib/guide";

// Engine-aware Guide body. Reads the same ?engine= param CommandBuilder uses so
// the guide toggles instantly with the Engine pill. Renders the active engine's
// guide markdown, or — for a non-vLLM engine that has no authored guide yet — a
// short notice instead of (misleadingly) the vLLM guide.
export function EngineAwareGuide({ recipe, defaultEngine = "vllm" }) {
  const searchParams = useSearchParams();
  const engine = searchParams.get("engine") || defaultEngine || "vllm";
  const md = pickGuide(engine, recipe);

  if (md) {
    return (
      <div className="guide-content">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
          {md}
        </Markdown>
      </div>
    );
  }

  if (engine !== "vllm") {
    const label = engine.charAt(0).toUpperCase() + engine.slice(1);
    return (
      <p className="text-sm text-muted-foreground leading-relaxed">
        No {label}-specific guide yet for this model — the command above is the
        authoritative setup. Switch the Engine pill to vLLM for that engine&apos;s
        full guide.
      </p>
    );
  }

  return null;
}
