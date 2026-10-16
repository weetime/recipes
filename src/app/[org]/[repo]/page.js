import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAllRecipes, getAllRoutablePairs, findVariantRedirect, getRecipeByHfId } from "@/lib/recipes";
import { recipeHref } from "@/lib/recipe-utils";
import { getEngineMeta, recipeEngineIds } from "@/lib/engine-meta";
import { siteUrl } from "@/lib/site-url";
import { loadStrategies } from "@/lib/strategies";
import { loadTaxonomy } from "@/lib/taxonomy";
import { resolveRecipePlatforms } from "@/lib/platforms";
import { getProviderLogo, getProviderLogoClass } from "@/lib/providers";
import { CommandBuilder } from "@/components/recipes/CommandBuilder";
import { EngineAwareGuide } from "@/components/recipes/EngineAwareGuide";
import { GuideLinks } from "@/components/recipes/GuideLinks";
import { DeployDialog } from "@/components/recipes/DeployDialog";
import { HuggingFaceIcon, ModelScopeIcon } from "@/components/icons/PlatformLogos";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Cpu, Layers, Pencil, Bug, ExternalLink, Link2 } from "lucide-react";
import {
  buildBreadcrumbLd,
  buildSoftwareApplicationLd,
  buildTechArticleLd,
  hardwareLabel,
  jsonLdScript,
} from "@/lib/jsonld";

export async function generateStaticParams() {
  return getAllRoutablePairs();
}

export async function generateMetadata({ params }) {
  const { org, repo } = await params;
  const recipe = getRecipeByHfId(org, repo);
  if (!recipe) return {};
  const { meta, model } = recipe;
  // Page <title> uses the canonical hf_id (e.g. "deepseek-ai/DeepSeek-V3.2")
  // — that's what people search for. The layout template appends " | vLLM
  // Recipes" so the final tab reads "deepseek-ai/DeepSeek-V3.2 | vLLM Recipes".
  const title = `${org}/${repo}`;
  const paramStr = model.parameter_count
    ? model.active_parameters && model.active_parameters !== model.parameter_count
      ? `${model.parameter_count} / ${model.active_parameters} active`
      : model.parameter_count
    : "";
  const ctxStr = model.context_length ? `${(model.context_length / 1024).toFixed(0)}K ctx` : "";
  const metaLine = [paramStr, (model.architecture || "").toUpperCase(), ctxStr]
    .filter(Boolean)
    .join(" · ");
  const versionStr = model.min_vllm_version ? `vLLM ${model.min_vllm_version}+` : "";
  // og:title follows the umbrella spec (PROD-5):
  //   "<Model Name> on vLLM — Serve command for <hardware list>"
  // The og:site_name already provides "vLLM Recipes" branding, so the on-vLLM
  // suffix here is purely a SERP-snippet signal. Falls back to the model meta
  // line when no verified hardware is listed.
  const hwList = hardwareLabel(recipe);
  const ogTitle = hwList
    ? `${repo} on vLLM — Serve command for ${hwList}`
    : metaLine
    ? `${title} — ${metaLine}`
    : title;
  // <meta name="description"> follows the umbrella spec template too. Prefer
  // the recipe's own description, then fall back to the templated form.
  const templateDescription = `Recommended vllm serve command, hardware matrix, and flag explanations for serving ${recipe.hf_id} with vLLM${hwList ? ` on ${hwList}` : ""}.`;
  const description = meta.description || templateDescription;
  const ogUrl = `/og?title=${encodeURIComponent(title)}&meta=${encodeURIComponent(
    metaLine
  )}&version=${encodeURIComponent(versionStr)}&path=${encodeURIComponent(`/${org}/${repo}`)}`;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title: ogTitle,
      description,
      url: `/${org}/${repo}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogUrl],
    },
    alternates: { canonical: `/${org}/${repo}` },
  };
}

export default async function RecipePage({ params, searchParams }) {
  const { org, repo } = await params;
  const recipe = getRecipeByHfId(org, repo);
  if (!recipe) {
    const v = findVariantRedirect(org, repo);
    // `?variant=default` is redundant — the builder already opens on the
    // default variant, so a default-variant checkpoint lands on a clean URL.
    if (v) {
      const qs = v.variantKey === "default" ? "" : `?variant=${encodeURIComponent(v.variantKey)}`;
      redirect(`/${v.parent.hf_org}/${v.parent.hf_repo}${qs}`);
    }
    notFound();
  }
  if (org !== recipe.hf_org || repo !== recipe.hf_repo) {
    const qs = new URLSearchParams(await searchParams).toString();
    redirect(`/${recipe.hf_org}/${recipe.hf_repo}${qs ? `?${qs}` : ""}`);
  }

  const strategies = loadStrategies();
  const taxonomy = loadTaxonomy();
  const logo = getProviderLogo(recipe.hf_org);

  // Per-recipe platform opt-in. Each entry is either a bare id ("modal") or
  // an object with overrides ({ id: "modal", install, url, blurb }) for
  // recipes that ship their own deploy script.
  const enabledPlatforms = resolveRecipePlatforms(recipe.meta?.platforms);

  const allRecipes = getAllRecipes();
  // related_recipes can be either "org/repo" HF id or the old slug format
  const related = (recipe.meta.related_recipes || [])
    .map((s) => allRecipes.find((r) => r.hf_id === s || r.meta.slug === s))
    .filter(Boolean);

  const recipeUrl = `${siteUrl}/${recipe.hf_org}/${recipe.hf_repo}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: recipe.hf_id,
      alternateName: recipe.meta.title,
      description: recipe.meta.description || recipe.meta.title,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Linux",
      url: recipeUrl,
      softwareRequirements: recipe.model.min_vllm_version
        ? `vLLM ${recipe.model.min_vllm_version}+`
        : "vLLM",
      creator: { "@type": "Organization", name: recipe.meta.provider, url: `https://huggingface.co/${recipe.hf_org}` },
      sameAs: [`https://huggingface.co/${recipe.hf_id}`],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inference Atlas", item: siteUrl },
        { "@type": "ListItem", position: 2, name: recipe.meta.provider, item: `${siteUrl}/${recipe.hf_org}` },
        { "@type": "ListItem", position: 3, name: recipe.hf_repo, item: recipeUrl },
      ],
    },
  ];

  return (
    <main className="py-8 w-full min-w-0">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={jsonLdScript(jsonLd)}
      />
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/browse" className="inline-flex items-center gap-1.5 font-semibold hover:text-vllm-blue"><ArrowLeft size={13} /> Catalog</Link>
        <span aria-hidden="true">/</span>
        <Link href={"/" + recipe.hf_org} className="hover:text-vllm-blue">{recipe.meta.provider}</Link>
        <span aria-hidden="true">/</span>
        <span className="max-w-[220px] truncate font-mono text-foreground">{recipe.hf_repo}</span>
      </nav>
      {/* ── Model header ── */}
      <header className="atlas-panel mb-6 p-6 sm:p-8">
        <div className="atlas-kicker mb-5">Model workspace / 01 Overview</div>
        <div className="flex items-start gap-4 mb-4">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={recipe.meta.provider} width={44} height={44} className={`rounded-xl mt-0.5 shrink-0 ${getProviderLogoClass(recipe.hf_org)}`} />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-[-0.045em] break-all">
              <span className="text-muted-foreground font-normal">{recipe.hf_org}/</span>
              {recipe.hf_repo}
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-4xl leading-6">{recipe.meta.description}</p>
            {recipe.meta.performance_headline && (
              <p className="text-xs text-muted-foreground/70 italic mt-1 leading-snug">{recipe.meta.performance_headline}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <a
                href={`https://huggingface.co/${recipe.hf_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-vllm-blue transition-colors"
              >
                <HuggingFaceIcon className="w-3.5 h-3.5" />
                View on HuggingFace
                <ExternalLink size={10} />
              </a>
              {recipe.modelscope_id && (
                <a
                  href={`https://modelscope.cn/models/${recipe.modelscope_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-vllm-blue transition-colors"
                >
                  <ModelScopeIcon className="w-3.5 h-3.5" />
                  View on ModelScope
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tags — single row, no duplication */}
        <div className="flex flex-wrap gap-1.5">
          {recipeEngineIds(recipe).map((id) => (
            <Badge key={id} variant="secondary" className="text-xs font-semibold">{getEngineMeta(id).label}</Badge>
          ))}
          <Badge variant="outline" className="gap-1 text-xs capitalize">
            {recipe.model.architecture === "moe" ? <Layers size={11} /> : <Cpu size={11} />}
            {recipe.model.architecture}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {recipe.model.parameter_count}
            {recipe.model.active_parameters && recipe.model.active_parameters !== recipe.model.parameter_count
              ? ` / ${recipe.model.active_parameters}`
              : ""}
          </Badge>
          <Badge variant="outline" className="text-xs">{(recipe.model.context_length || 0).toLocaleString()} ctx</Badge>
          <a
            href="https://vllm.ai/#quick-start"
            target="_blank"
            rel="noopener noreferrer"
            title="Install vLLM"
            className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-colors hover:border-vllm-blue/50 hover:text-vllm-blue"
          >
            vLLM {recipe.model.min_vllm_version}+
            <ExternalLink size={10} className="ml-1 opacity-50" />
          </a>
          {recipe.meta.tasks?.includes("omni") && (
            <a
              href="https://github.com/vllm-project/vllm-omni"
              target="_blank"
              rel="noopener noreferrer"
              title="vLLM-Omni serves the generation (omni) path — nightly wheels"
              className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-colors hover:border-vllm-blue/50 hover:text-vllm-blue"
            >
              vLLM-Omni
              <span className="ml-1 text-vllm-yellow">nightly</span>
              <ExternalLink size={10} className="ml-1 opacity-50" />
            </a>
          )}
          {recipe.meta.tasks?.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs capitalize">{t}</Badge>
          ))}
        </div>
      </header>

      <nav aria-label="Recipe sections" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <a href="#configure" className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-accent-foreground hover:bg-vllm-blue/15"><span className="font-mono">02</span> Configure</a>
        {(recipe.guide || Object.values(recipe.engines ?? {}).some((e) => e?.guide)) && (
          <a href="#recipe-guide" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-muted-foreground hover:text-vllm-blue"><span className="font-mono">03</span> Read the guide</a>
        )}
      </nav>

      {/* ── Command Builder ── */}
      <section id="configure" className="mb-10 scroll-mt-28">
        <div className="mb-5">
          <div className="atlas-kicker">02 / Configure</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Build your serve command</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose engine, hardware and deployment options. The command updates as you go.</p>
        </div>
        <Suspense fallback={<div className="h-40 rounded-2xl bg-muted animate-pulse" />}>
          <CommandBuilder recipe={recipe} strategies={strategies} taxonomy={taxonomy} />
        </Suspense>
      </section>

      {/* ── Reference sections ── */}
      <section id="recipe-guide" className="space-y-3 scroll-mt-28">
        {(recipe.guide || Object.values(recipe.engines ?? {}).some((e) => e?.guide)) && (
          <>
            <div>
              <div className="atlas-kicker">03 / Understand</div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">Implementation guide</h2>
            </div>
            <Accordion title="Model notes and examples" defaultOpen>
            <Suspense fallback={null}>
              <EngineAwareGuide recipe={recipe} defaultEngine={recipe.default_engine || "vllm"} />
            </Suspense>
            </Accordion>
          </>
        )}

      </section>

      {/* ── Footer ── */}
      <footer className="mt-10 pt-4 border-t border-border text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
        <span>Updated {recipe.meta.date_updated}</span>
        <a
          href={recipe.source?.edit_url || `https://github.com/vllm-project/recipes/edit/main/models/${recipe.hf_org}/${recipe.hf_repo}.yaml`}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Pencil size={12} /> Edit recipe
        </a>
        {recipe.source?.overlays?.map((o) => o.edit_url && (
          <a
            key={o.path}
            href={o.edit_url}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Pencil size={12} /> Edit {o.source} overlay
          </a>
        ))}
        {recipe.source?.sha && (
          <a
            href={`https://github.com/${recipe.source.repo}/blob/${recipe.source.sha}/${recipe.source.path}`}
            className="font-mono hover:text-foreground transition-colors"
          >
            {recipe.source.repo}@{recipe.source.sha.slice(0, 7)}
          </a>
        )}
        <a
          href="https://github.com/weetime/recipes/issues"
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Bug size={12} /> Report issue
        </a>
        <DeployDialog platforms={enabledPlatforms} hfId={recipe.hf_id} />
        {related.length > 0 && (
          <span className="basis-full mt-1">
            Related:{" "}
            {related.map((r, i) => (
              <span key={r.hf_id}>
                {i > 0 && " · "}
                <Link href={recipeHref(r)} className="text-vllm-blue hover:underline">{r.meta.title}</Link>
              </span>
            ))}
          </span>
        )}
      </footer>
    </main>
  );
}

function HeadingLink({ id }) {
  return (
    <a href={`#${id}`} data-guide-link className="guide-heading-link" aria-label="Copy link to this section" title="Copy link to this section">
      <Link2 size={16} aria-hidden="true" />
    </a>
  );
}

const guideHeadings = Object.fromEntries(
  ["h1", "h2", "h3", "h4", "h5", "h6"].map((Tag) => [Tag, function GuideHeading({ id, children }) {
    return <Tag id={id}>{children}{id && <HeadingLink id={id} />}</Tag>;
  }])
);

function Accordion({ title, children, id, defaultOpen = false }) {
  // Stronger border than bare `--border` (10% in dark mode) so the outline is
  // visible on both themes. `foreground/15` stays subtle but catches enough
  // contrast to define the card.
  return (
    <details
      id={id}
      className="group rounded-xl border border-foreground/15 bg-card/40 overflow-hidden"
      open={defaultOpen || undefined}
    >
      <summary className="px-5 py-3 cursor-pointer text-sm font-semibold select-none hover:bg-foreground/[0.04] transition-colors flex items-center justify-between">
        {title}
        <ChevronIcon />
      </summary>
      <div className="px-5 pb-5 border-t border-foreground/10 pt-4">{children}</div>
    </details>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
