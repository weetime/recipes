import { Link } from "@/i18n/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { ArrowRight, ArrowUpRight, Cpu, Layers } from "lucide-react";
import { getProviderLogo, getProviderLogoClass, getProviderDisplayName } from "@/lib/providers";
import { compareRecipesByDateAdded } from "@/lib/recipe-utils";

const LATEST_COUNT = 7;
const LATEST_PER_ORG = 2;

function latestRecipes(recipes) {
  const perOrg = new Map();
  const output = [];
  for (const recipe of [...recipes].sort(compareRecipesByDateAdded)) {
    const org = recipe.hf_org || "unknown";
    if ((perOrg.get(org) || 0) >= LATEST_PER_ORG) continue;
    perOrg.set(org, (perOrg.get(org) || 0) + 1);
    output.push(recipe);
    if (output.length === LATEST_COUNT) break;
  }
  return output;
}

function recipeFacts(recipe) {
  const variant = recipe.variants?.default || {};
  const params = recipe.model?.parameter_count || "—";
  const active = recipe.model?.active_parameters;
  return [
    active && active !== params ? params + " / " + active + " active" : params,
    variant.precision?.toUpperCase(),
    recipe.meta?.tasks?.[0],
  ].filter(Boolean);
}

export function RecipeCardGrid({ recipes }) {
  const t = useT();
  const latest = latestRecipes(recipes);
  const [featured, ...others] = latest;
  const counts = new Map();
  for (const recipe of recipes) {
    counts.set(recipe.hf_org, (counts.get(recipe.hf_org) || 0) + 1);
  }
  const providers = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);

  return (
    <div className="mt-16 space-y-16">
      <section aria-labelledby="latest-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="atlas-kicker">New in the atlas / 01</div>
            <h2 id="latest-heading" className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Fresh deployment paths</h2>
            <p className="mt-2 text-sm text-muted-foreground">Recently added recipes, ready to configure for your stack.</p>
          </div>
          <Link href="/browse?sort=updated" className="inline-flex items-center gap-2 text-sm font-bold text-vllm-blue hover:underline">
            Open the full catalog <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {featured && <FeaturedRecipe recipe={featured} />}
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((recipe) => <CompactRecipe key={recipe.hf_id} recipe={recipe} />)}
          </div>
        </div>
      </section>

      <section aria-labelledby="providers-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="atlas-kicker">Explore the ecosystem / 02</div>
            <h2 id="providers-heading" className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Where models come from</h2>
            <p className="mt-2 text-sm text-muted-foreground">Jump into a provider collection or use catalog filters to narrow the field.</p>
          </div>
          <Link href="/browse?panel=open" className="inline-flex items-center gap-2 text-sm font-bold text-vllm-blue hover:underline">
            Filter by provider <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {providers.map(([org, count]) => <ProviderTile key={org} org={org} count={count} />)}
        </div>
      </section>
    </div>
  );
}

function FeaturedRecipe({ recipe }) {
  const logo = getProviderLogo(recipe.hf_org);
  const facts = recipeFacts(recipe);
  const isMoe = recipe.model?.architecture === "moe";
  return (
    <Link href={"/" + recipe.hf_id} className="group atlas-panel relative flex min-h-[400px] flex-col overflow-hidden p-7 transition-all hover:-translate-y-1 hover:border-vllm-blue/40 hover:shadow-xl sm:p-9">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#dbf4e3] blur-3xl dark:bg-[#1c5b4b]/40" aria-hidden="true" />
      <div className="relative flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={38} height={38} className={"rounded-xl " + getProviderLogoClass(recipe.hf_org)} />
        ) : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-base font-bold text-accent-foreground">{recipe.hf_org.charAt(0)}</span>}
        <div>
          <div className="atlas-kicker">Featured recipe</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{recipe.hf_org}</div>
        </div>
        <ArrowUpRight size={20} className="ml-auto text-vllm-blue transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
      </div>
      <div className="relative mt-auto pt-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
          {isMoe ? <Layers size={14} /> : <Cpu size={14} />}
          {isMoe ? "Mixture of experts" : "Dense model"}
        </div>
        <h3 className="break-words text-3xl font-extrabold leading-tight tracking-[-0.05em] group-hover:text-vllm-blue transition-colors">{recipe.hf_repo}</h3>
        <p className="mt-3 line-clamp-3 max-w-lg text-sm leading-6 text-muted-foreground">{recipe.meta?.description}</p>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
          {facts.map((fact) => <span key={fact} className="rounded-full border border-border bg-background px-3 py-1 font-mono text-[11px] font-semibold text-muted-foreground">{fact}</span>)}
        </div>
      </div>
    </Link>
  );
}

function CompactRecipe({ recipe }) {
  const logo = getProviderLogo(recipe.hf_org);
  const facts = recipeFacts(recipe);
  return (
    <Link href={"/" + recipe.hf_id} className="group atlas-panel flex min-h-[188px] flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-vllm-blue/40 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" width={25} height={25} className={"rounded-md " + getProviderLogoClass(recipe.hf_org)} />
        ) : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-foreground">{recipe.hf_org.charAt(0)}</span>}
        <span className="truncate font-mono text-[11px] text-muted-foreground">{recipe.hf_org}</span>
        <ArrowUpRight size={16} className="ml-auto shrink-0 text-muted-foreground transition-colors group-hover:text-vllm-blue" />
      </div>
      <h3 className="mt-4 line-clamp-2 break-all text-base font-bold leading-tight tracking-[-0.025em] group-hover:text-vllm-blue transition-colors">{recipe.hf_repo}</h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{recipe.meta?.description}</p>
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 font-mono text-[10px] font-semibold uppercase text-vllm-blue">
        {facts.map((fact) => <span key={fact}>{fact}</span>)}
      </div>
    </Link>
  );
}

function ProviderTile({ org, count }) {
  const logo = getProviderLogo(org);
  const name = getProviderDisplayName(org);
  return (
    <Link href={"/" + org} className="group atlas-panel flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-vllm-blue/40 hover:shadow-md">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={34} height={34} className={"rounded-lg shrink-0 " + getProviderLogoClass(org)} />
      ) : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-accent-foreground">{name.charAt(0)}</span>}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold group-hover:text-vllm-blue">{name}</span>
        <span className="block text-[11px] text-muted-foreground">{count} {count === 1 ? "recipe" : "recipes"}</span>
      </span>
    </Link>
  );
}
