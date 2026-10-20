import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { getAllRecipes, getAllRoutablePairs, findVariantRedirect, getRecipeByHfId } from "@/lib/recipes";
import { getPerformanceReportsForModel } from "@/lib/performance-reports";
import { recipeHref } from "@/lib/recipe-utils";
import { getEngineMeta, recipeEngineIds } from "@/lib/engine-meta";
import { siteUrl } from "@/lib/site-url";
import { loadStrategies } from "@/lib/strategies";
import { loadTaxonomy } from "@/lib/taxonomy";
import { resolveRecipePlatforms } from "@/lib/platforms";
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
import { getTranslations } from "next-intl/server";

export async function generateStaticParams() {
  return getAllRoutablePairs();
}

export async function generateMetadata({ params }) {
  const { org, repo, locale } = await params;
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
  const templateDescription = locale === "zh"
    ? `查看 ${recipe.hf_id} 的推荐 vLLM 服务命令、硬件配置和参数说明。`
    : `Recommended vllm serve command, hardware matrix, and flag explanations for serving ${recipe.hf_id} with vLLM${hwList ? ` on ${hwList}` : ""}.`;
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
      url: locale === "zh" ? `/zh/${org}/${repo}` : `/${org}/${repo}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogUrl],
    },
    alternates: { canonical: locale === "zh" ? `/zh/${org}/${repo}` : `/${org}/${repo}`, languages: { en: `/${org}/${repo}`, zh: `/zh/${org}/${repo}` } },
  };
}

export default async function RecipePage({ params, searchParams }) {
  const { org, repo, locale } = await params;
  const t = await getTranslations({ locale });
  const recipe = getRecipeByHfId(org, repo);
  if (!recipe) {
    const v = findVariantRedirect(org, repo);
    // `?variant=default` is redundant — the builder already opens on the
    // default variant, so a default-variant checkpoint lands on a clean URL.
    if (v) {
      const qs = v.variantKey === "default" ? "" : `?variant=${encodeURIComponent(v.variantKey)}`;
      redirect(`${locale === "zh" ? "/zh" : ""}/${v.parent.hf_org}/${v.parent.hf_repo}${qs}`);
    }
    notFound();
  }
  if (org !== recipe.hf_org || repo !== recipe.hf_repo) {
    const qs = new URLSearchParams(await searchParams).toString();
    redirect(`${locale === "zh" ? "/zh" : ""}/${recipe.hf_org}/${recipe.hf_repo}${qs ? `?${qs}` : ""}`);
  }

  const strategies = loadStrategies();
  const taxonomy = loadTaxonomy();

  // Per-recipe platform opt-in. Each entry is either a bare id ("modal") or
  // an object with overrides ({ id: "modal", install, url, blurb }) for
  // recipes that ship their own deploy script.
  const enabledPlatforms = resolveRecipePlatforms(recipe.meta?.platforms);

  const allRecipes = getAllRecipes();
  // related_recipes can be either "org/repo" HF id or the old slug format
  const related = (recipe.meta.related_recipes || [])
    .map((s) => allRecipes.find((r) => r.hf_id === s || r.meta.slug === s))
    .filter(Boolean);
  const performanceReports = getPerformanceReportsForModel(recipe.hf_id);

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
        { "@type": "ListItem", position: 1, name: "Model Index", item: siteUrl },
        { "@type": "ListItem", position: 2, name: recipe.meta.provider, item: `${siteUrl}/${recipe.hf_org}` },
        { "@type": "ListItem", position: 3, name: recipe.hf_repo, item: recipeUrl },
      ],
    },
  ];

  return (
    <main className="py-10 w-full min-w-0">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={jsonLdScript(jsonLd)}
      />
      <nav aria-label={t("detail.breadcrumb")} className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/browse" className="inline-flex items-center gap-1.5 font-semibold hover:text-vllm-blue"><ArrowLeft size={13} /> {t("detail.catalog")}</Link>
        <span aria-hidden="true">/</span>
        <Link href={"/" + recipe.hf_org} className="hover:text-vllm-blue">{recipe.meta.provider}</Link>
        <span aria-hidden="true">/</span>
        <span className="max-w-[220px] truncate font-mono text-foreground">{recipe.hf_repo}</span>
      </nav>
      {/* ── Model header ── */}
      <header className="mb-8 border-b border-border pb-8 pt-6">
        <div className="atlas-kicker mb-5">{t("detail.modelType")} / {recipe.hf_org}</div>
        <div className="flex items-start gap-4 mb-4">
          <span className="provider-monogram mt-0.5 h-11 w-11 shrink-0 text-lg" aria-hidden="true">{recipe.hf_org.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl sm:text-6xl font-semibold tracking-[-0.07em] break-all">
              <span className="text-muted-foreground font-normal">{recipe.hf_org}/</span>
              {recipe.hf_repo}
            </h1>
            <p className="text-sm text-muted-foreground mt-3 max-w-4xl leading-6">{recipe.meta.description}</p>
            {recipe.meta.performance_headline && (
              <p className="text-[13px] text-muted-foreground italic mt-1 leading-relaxed">{recipe.meta.performance_headline}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <a
                href={`https://huggingface.co/${recipe.hf_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-vllm-blue transition-colors"
              >
                <HuggingFaceIcon className="w-3.5 h-3.5" />
                {t("detail.viewHuggingFace")}
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
                  {t("detail.viewModelScope")}
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
            {t.has(`architecture.${recipe.model.architecture}`) ? t(`architecture.${recipe.model.architecture}`) : recipe.model.architecture}
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
            title={t("detail.installVllm")}
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
          {recipe.meta.tasks?.map((task) => (
            <Badge key={task} variant="secondary" className="text-xs capitalize">{t.has(`tasks.${task}`) ? t(`tasks.${task}`) : task}</Badge>
          ))}
        </div>
      </header>

      {performanceReports.length > 0 && (
        <section aria-label={t("detail.performanceReports")} className="mb-10 border-y border-border py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-label">{t("detail.measuredConfigurations", { count: performanceReports.length })}</div>
              <h2 className="mt-2 text-lg font-semibold tracking-[-.025em]">{t("detail.performanceReports")}</h2>
            </div>
            <Link href="/reports" className="text-xs text-muted-foreground hover:text-vllm-blue">{t("detail.allReports")}</Link>
          </div>
          <div className="mt-4 divide-y divide-border border-t border-border">
            {performanceReports.map((report) => (
              <div key={report.slug} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{report.date}</span><span>{report.hardware}</span><span>{report.precision}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{report.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{report.highlights[0].value} {report.highlights[0].unit} · {report.highlights[0].label}</p>
                </div>
                <a href={report.href} className="text-sm font-semibold text-vllm-blue hover:underline">{t("detail.readReport")}</a>
              </div>
            ))}
          </div>
        </section>
      )}

      <nav aria-label={t("detail.sections")} className="mb-10 flex flex-wrap items-center gap-8 border-b border-border pb-4 text-sm font-medium">
        <a href="#configure" className="inline-flex items-center gap-2 text-vllm-blue hover:underline"><span className="font-mono">02</span> {t("detail.configureStep")}</a>
        {(recipe.guide || Object.values(recipe.engines ?? {}).some((e) => e?.guide)) && (
          <a href="#recipe-guide" className="inline-flex items-center gap-2 text-muted-foreground hover:text-vllm-blue"><span className="font-mono">03</span> {t("detail.guideStep")}</a>
        )}
      </nav>

      {/* ── Command Builder ── */}
      <section id="configure" className="mb-10 scroll-mt-28">
        <div className="mb-5">
          <div className="atlas-kicker">{t("detail.configureEyebrow")}</div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">{t("detail.configureServing")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("detail.configureDescription")}</p>
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
              <div className="atlas-kicker">{t("detail.understandEyebrow")}</div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">{t("detail.technicalNotes")}</h2>
            </div>
            <Accordion title={t("detail.modelNotes")} defaultOpen>
            <p className="mb-4 text-xs text-muted-foreground">{t("detail.originalContent")}</p>
            <Suspense fallback={null}>
              <EngineAwareGuide recipe={recipe} defaultEngine={recipe.default_engine || "vllm"} locale={locale} />
            </Suspense>
            </Accordion>
          </>
        )}

      </section>


      {/* ── Footer ── */}
      <footer className="mt-10 pt-4 border-t border-border text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
        <span>{t("detail.updatedLabel")} {recipe.meta.date_updated}</span>
        <a
          href={recipe.source?.edit_url || `https://github.com/vllm-project/recipes/edit/main/models/${recipe.hf_org}/${recipe.hf_repo}.yaml`}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Pencil size={12} /> {t("detail.editRecipe")}
        </a>
        {recipe.source?.overlays?.map((o) => o.edit_url && (
          <a
            key={o.path}
            href={o.edit_url}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Pencil size={12} /> {t("detail.editOverlay", { source: o.source })}
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
          <Bug size={12} /> {t("detail.reportIssue")}
        </a>
        <DeployDialog platforms={enabledPlatforms} hfId={recipe.hf_id} />
        {related.length > 0 && (
          <span className="basis-full mt-1">
            {t("detail.related")}{" "}
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
