import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { HomeSignal } from "@/components/HomeSignal";
import { isHardwareSupported, variantRunsOnHardware } from "@/lib/command-synthesis";
import { getAllRecipes } from "@/lib/recipes";
import { loadTaxonomy } from "@/lib/taxonomy";
import { compareRecipesByDateAdded } from "@/lib/recipe-utils";

export const metadata = {
  title: { absolute: "Model Index — Deployment recipes for real hardware" },
  description: "A practical index of model serving recipes for vLLM and SGLang.",
};

const hardware = [
  { label: "NVIDIA H200", short: "H200", brand: "NVIDIA", id: "h200" },
  { label: "NVIDIA B200", short: "B200", brand: "NVIDIA", id: "b200" },
  { label: "AMD MI300X", short: "MI300X", brand: "AMD", id: "mi300x" },
  { label: "Ascend 910B4", short: "910B4", brand: "ASCEND", id: "ascend_910b4" },
];

export default function HomePage() {
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
            <span>MODEL INDEX / SERVING RECIPES</span>
            <span className="hidden sm:inline">VLLM + SGLANG&nbsp; / &nbsp;OPEN CATALOG</span>
          </div>
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <div className="home-eyebrow"><span className="home-eyebrow-line" /> AN ENGINEERING REFERENCE FOR MODEL SERVING</div>
              <h1>From model<br /><em>to machine.</em></h1>
              <p>Find a deployment recipe that fits your hardware. Configure the engine, inspect the command, and run it on your terms.</p>
              <div className="home-hero-actions">
                <Link href="/browse" className="home-primary-action">Explore recipes <ArrowUpRight size={18} /></Link>
                <Link href="/image-selector" className="home-secondary-action">Image reference <ArrowRight size={16} /></Link>
              </div>
              <div className="home-hero-proof"><span className="home-proof-dot" /> CURATED FOR REAL HARDWARE <span className="home-proof-separator">/</span> UPDATED FROM SOURCE RECIPES</div>
            </div>
            <HomeSignal options={options} />
          </div>
          <div className="home-hero-stats">
            <div><strong>{recipes.length}</strong><span>MODEL RECIPES</span></div>
            <div><strong>{hardwareCount}</strong><span>HARDWARE PROFILES</span></div>
            <div><strong>{sglangCount}</strong><span>SGLANG PATHS</span></div>
            <Link href="/browse" className="home-stats-link">OPEN THE INDEX <ArrowUpRight size={17} /></Link>
          </div>
        </div>
      </section>
      <div className="page-frame">
        <section className="home-hardware-section" aria-labelledby="hardware-heading">
          <div className="home-section-heading">
            <div>
              <div className="section-label">01 / COMPUTE INDEX</div>
              <h2 id="hardware-heading">Start with your hardware.</h2>
            </div>
            <p>Choose the accelerator you already run. The index narrows to recipes with a compatible checkpoint and serving path.</p>
          </div>
          <div className="hardware-grid">
            {options.map((option, index) => (
              <Link key={option.id} href={"/browse?hw=" + option.id + "&panel=open"} className="hardware-card group">
                <div className="hardware-card-top"><span>{String(index + 1).padStart(2, "0")} / {option.brand}</span><ArrowUpRight size={18} /></div>
                <div className="hardware-card-name">{option.short}</div>
                <div className="hardware-card-rule"><span style={{ width: (option.count / recipes.length * 100) + "%" }} /></div>
                <div className="hardware-card-foot"><strong>{option.count}</strong><span>compatible recipes</span></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-recent-section" aria-labelledby="recent-heading">
          <div className="home-section-heading">
            <div>
              <div className="section-label">02 / RECENT ADDITIONS</div>
              <h2 id="recent-heading">Fresh from the index.</h2>
            </div>
            <Link href="/browse?sort=updated" className="action-link">View all recipes <ArrowUpRight size={17} /></Link>
          </div>
          <div className="home-recent-grid">
            {recent[0] && (
              <Link href={"/" + recent[0].hf_id} className="home-featured-recipe group">
                <span className="section-label">LATEST RECIPE / {recent[0].hf_org}</span>
                <div>
                  <h3>{recent[0].hf_repo}</h3>
                  <p>{recent[0].meta?.description}</p>
                </div>
                <div className="home-featured-foot">
                  <span>{recent[0].model?.parameter_count || "—"} / {recent[0].variants?.default?.precision?.toUpperCase() || "—"}</span>
                  <span className="inline-flex items-center gap-2 text-vllm-blue">OPEN RECIPE <ArrowUpRight size={17} /></span>
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
          <div className="section-label">03 / IMAGE REFERENCE</div>
          <div className="mt-7 flex flex-wrap items-end justify-between gap-8">
            <div><h2>One stack.<br />The right images.</h2><p>Resolve GPUStack server and worker images for your accelerator, runtime, architecture and registry.</p></div>
            <Link href="/image-selector" className="home-image-link">Open image selector <ArrowUpRight size={20} /></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
