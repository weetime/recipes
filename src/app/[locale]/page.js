import { Link } from "@/i18n/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HomeSignal } from "@/components/HomeSignal";
import { isHardwareSupported, variantRunsOnHardware } from "@/lib/command-synthesis";
import { getAllRecipes } from "@/lib/recipes";
import { loadTaxonomy } from "@/lib/taxonomy";
import { compareRecipesByDateAdded } from "@/lib/recipe-utils";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: { absolute: chinese ? "Model Index — 模型部署配方" : "Model Index — Deployment recipes for real hardware" },
    description: chinese ? "面向 vLLM 和 SGLang 的模型服务配方目录。" : "A practical index of model serving recipes for vLLM and SGLang.",
    alternates: { canonical: chinese ? "/zh" : "/", languages: { en: "/", zh: "/zh" } },
  };
}

const hardware = [
  { label: "NVIDIA H200", short: "H200", brand: "NVIDIA", id: "h200" },
  { label: "NVIDIA B200", short: "B200", brand: "NVIDIA", id: "b200" },
  { label: "AMD MI300X", short: "MI300X", brand: "AMD", id: "mi300x" },
  { label: "Ascend 910B4", short: "910B4", brand: "ASCEND", id: "ascend_910b4" },
];

export default async function HomePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const recipes = getAllRecipes();
  const recent = [...recipes].sort(compareRecipesByDateAdded).slice(0, 8);
  const taxonomy = loadTaxonomy();
  const hardwareCount = Object.keys(taxonomy.hardware_profiles).length;
  const sglangCount = recipes.filter((recipe) => recipe.engines?.sglang).length;
  const options = hardware.map((item) => {
    const profile = taxonomy.hardware_profiles[item.id];
    const matches = recipes.filter((recipe) =>
      isHardwareSupported(recipe, item.id)
      && (!profile.restricted || item.id in (recipe.meta?.hardware || {}))
      && Object.values(recipe.variants || {}).some((variant) => variantRunsOnHardware(profile, variant, item.id))
    );
    const sample = [...matches].sort(compareRecipesByDateAdded)[0];
    const variant = sample && Object.entries(sample.variants || {}).find(([, value]) =>
      variantRunsOnHardware(profile, value, item.id)
    );
    const sampleQuery = new URLSearchParams({ hardware: item.id });
    if (variant?.[0] && variant[0] !== "default") sampleQuery.set("variant", variant[0]);
    return {
      ...item,
      count: matches.length,
      sample: sample?.hf_repo || "Explore recipes",
      sampleHref: sample ? `/${sample.hf_id}?${sampleQuery}` : `/browse?hw=${item.id}`,
      engine: "vLLM",
    };
  });
  return (
    <main className="pb-24">
      <section className="home-hero">
        <div className="page-frame relative z-10">
          <div className="home-hero-meta">
            <span>{t("home.indexMeta")}</span>
            <span className="hidden sm:inline">VLLM + SGLANG&nbsp; / &nbsp;OPEN CATALOG</span>
          </div>
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-eyebrow"><span className="home-eyebrow-line" /> {t("home.eyebrow")}</div>
              <h1>{t("home.headline1")}<br /><em>{t("home.headline2")}</em></h1>
              <p>{t("home.intro")}</p>
              <div className="home-hero-actions">
                <Link href="/browse" className="home-primary-action">{t("home.explore")} <ArrowUpRight size={18} /></Link>
                <Link href="/image-selector" className="home-secondary-action">{t("home.imageReference")} <ArrowRight size={16} /></Link>
              </div>
              <div className="home-hero-proof"><span className="home-proof-dot" /> {t("home.proofCurated")} <span className="home-proof-separator">/</span> {t("home.proofUpdated")}</div>
            </div>
            <HomeSignal options={options} />
          </div>
          <div className="home-hero-stats">
            <div><strong>{recipes.length}</strong><span>{t("home.modelRecipes")}</span></div>
            <div><strong>{hardwareCount}</strong><span>{t("home.hardwareProfiles")}</span></div>
            <div><strong>{sglangCount}</strong><span>{t("home.sglangPaths")}</span></div>
            <Link href="/browse" className="home-stats-link">{t("home.openIndex")} <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>
      <div className="page-frame">
        <section className="home-hardware-section" aria-labelledby="hardware-heading">
          <div className="home-section-heading">
            <div>
              <div className="section-label">01 / {t("home.computeIndex")}</div>
              <h2 id="hardware-heading">{t("home.hardwareTitle")}</h2>
            </div>
            <p>{t("home.hardwareDescription")}</p>
          </div>
          <div className="hardware-grid">
            {options.map((option, index) => (
              <Link key={option.id} href={"/browse?hw=" + option.id + "&panel=open"} className="hardware-card group">
                <div className="hardware-card-top"><span>{String(index + 1).padStart(2, "0")} / {option.brand}</span><ArrowUpRight size={18} /></div>
                <div className="hardware-card-name">{option.short}</div>
                <div className="hardware-card-rule"><span style={{ width: (option.count / recipes.length * 100) + "%" }} /></div>
                <div className="hardware-card-foot"><strong>{option.count}</strong><span>{t("home.compatibleRecipes")}</span></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-recent-section" aria-labelledby="recent-heading">
          <div className="home-section-heading">
            <div>
              <div className="section-label">02 / {t("home.recentAdditions")}</div>
              <h2 id="recent-heading">{t("home.freshTitle")}</h2>
            </div>
            <Link href="/browse?sort=updated" className="action-link">{t("home.viewRecipes")} <ArrowUpRight size={17} /></Link>
          </div>
          <div className="home-recent-grid">
            {recent[0] && (
              <Link href={"/" + recent[0].hf_id} className="home-featured-recipe group">
                <span className="section-label">{t("home.latestRecipe")} / {recent[0].hf_org}</span>
                <div>
                  <h3>{recent[0].hf_repo}</h3>
                  <p>{recent[0].meta?.description}</p>
                </div>
                <div className="home-featured-foot">
                  <span>{recent[0].model?.parameter_count || "—"} / {recent[0].variants?.default?.precision?.toUpperCase() || "—"}</span>
                  <span className="inline-flex items-center gap-2 text-vllm-blue">{t("home.openRecipe")} <ArrowUpRight size={17} /></span>
                </div>
              </Link>
            )}
            <div className="home-recent-list">
              {recent.slice(1, 8).map((recipe, index) => (
                <Link key={recipe.hf_id} href={"/" + recipe.hf_id} className="home-recent-row group">
                  <span className="font-mono text-xs text-muted-foreground">{String(index + 2).padStart(2, "0")}</span>
                  <span className="min-w-0"><strong className="block truncate font-medium group-hover:text-vllm-blue">{recipe.hf_repo}</strong><small className="block truncate text-muted-foreground">{recipe.hf_org}</small></span>
                  <span className="hidden font-mono text-xs text-muted-foreground sm:block">{recipe.model?.parameter_count || "—"}</span>
                  <ArrowUpRight size={16} className="text-vllm-blue" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="home-image-cta">
          <div className="section-label">03 / {t("home.imageReference")}</div>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-8">
            <div><h2>{t("home.imageTitle1")}<br />{t("home.imageTitle2")}</h2><p>{t("home.imageDescription")}</p></div>
            <Link href="/image-selector" className="home-image-link">{t("home.openImageSelector")} <ArrowUpRight size={20} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
