import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { getAllRecipes } from "@/lib/recipes";
import { loadTaxonomy } from "@/lib/taxonomy";
import { isHardwareSupported, variantRunsOnHardware } from "@/lib/command-synthesis";
import { BrowseList } from "@/components/recipes/BrowseList";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: chinese ? "浏览模型配方" : "Explore recipes",
    description: chinese ? "按硬件、工作负载、精度、规模和提供方查找 vLLM 或 SGLang 部署方案。" : "Find a vLLM or SGLang deployment path by hardware, workload, precision, size, and provider.",
    alternates: { canonical: chinese ? "/zh/browse" : "/browse", languages: { en: "/browse", zh: "/zh/browse" } },
  };
}

export default async function BrowsePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const recipes = getAllRecipes();
  const hardwareProfiles = Object.entries(loadTaxonomy().hardware_profiles);
  // Slim payload — drop the heavy `guide` markdown before sending to the
  // client, same shape the search box uses but with the fields BrowseList
  // needs for filtering and display.
  const slim = recipes.map((r) => {
    const v = r.variants?.default || {};
    const variants = Object.entries(r.variants || {})
      .filter(([, variant]) => variant?.precision)
      .map(([key, variant]) => ({
        key,
        precision: variant.precision,
        hardware: hardwareProfiles
          .filter(([id, profile]) =>
            isHardwareSupported(r, id)
            && (!profile.restricted || id in (r.meta?.hardware || {}))
            && variantRunsOnHardware(profile, variant, id)
          )
          .map(([id]) => id),
      }));
    return {
      hf_id: r.hf_id,
      hf_org: r.hf_org,
      hf_repo: r.hf_repo,
      hf_released: r.hf_released || null,
      meta: {
        title: r.meta?.title || r.hf_repo,
        provider: r.meta?.provider || r.hf_org,
        description: r.meta?.description || "",
        performance_headline: r.meta?.performance_headline || "",
        date_updated: r.meta?.date_updated || null,
        tasks: r.meta?.tasks || [],
        hardware: r.meta?.hardware || {},
      },
      model: {
        architecture: r.model?.architecture || "dense",
        parameter_count: r.model?.parameter_count || "",
        active_parameters: r.model?.active_parameters || null,
        context_length: r.model?.context_length || 0,
      },
      variant: {
        precision: v.precision || null,
        vram_minimum_gb: v.vram_minimum_gb || null,
      },
      // All distinct variant precisions, not just the default. NVFP4 / MXFP4
      // / INT4 / etc. typically ship as *non-default* variants (quantized
      // checkpoints), so a precision filter that only inspects the default
      // would miss them. Used by BrowseList for both counts and matching.
      precisions: [...new Set(variants.map((variant) => variant.precision))],
      engines: ["vllm", ...Object.keys(r.engines || {}).filter((id) => id !== "vllm")],
      variants,
    };
  });

  return (
    <main className="page-frame pb-20">
      <header className="border-b border-border pb-10 pt-10 lg:pb-16 lg:pt-16">
        <div className="section-label">{t("browse.title")} / {slim.length}</div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-none tracking-[-.075em]">{t("browse.heroTitle")}</h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">{t("browse.heroDescription")}</p>
        </div>
      </header>
      <section id="catalog-results" className="pt-10">
        <Suspense fallback={<div className="text-sm text-muted-foreground py-8">{t("browse.loading")}</div>}>
          <BrowseList
            recipes={slim}
            hardwareOptions={hardwareProfiles.map(([id, profile]) => ({
              id,
              brand: profile.brand,
              label: profile.display_name,
            }))}
          />
        </Suspense>
      </section>

      {/* Server-rendered crawlable index. BrowseList above is client-rendered,
          so without this the model pages have no internal links pointing at
          them and search engines can only discover them via the sitemap. A
          plain <a> list gives every recipe a real internal link from this
          indexable hub page. */}
      <details className="mt-12 border-t border-border pt-6">
          <summary className="w-fit cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
          {t("browse.allRecipes", { count: slim.length })}
        </summary>
        <nav aria-label={t("browse.allRecipesAria")} className="mt-3">
          <ul className="columns-2 sm:columns-3 lg:columns-4 gap-x-6 text-sm">
            {slim
              .slice()
              .sort((a, b) => a.hf_id.localeCompare(b.hf_id))
              .map((r) => (
                <li key={r.hf_id} className="mb-1 break-inside-avoid">
                  <Link href={`/${r.hf_org}/${r.hf_repo}`} className="text-vllm-blue hover:underline">
                    {r.hf_id}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </details>
    </main>
  );
}
