import { getAllRecipes } from "@/lib/recipes";
import { ModelQuickNav } from "@/components/ModelQuickNav";

export default function OrgLayout({ children }) {
  const recipes = getAllRecipes()
    .map((recipe) => ({
      id: recipe.hf_id,
      org: recipe.hf_org,
      repo: recipe.hf_repo,
      title: recipe.meta?.title || recipe.hf_repo,
      provider: recipe.meta?.provider || recipe.hf_org,
      released: recipe.hf_released || "",
    }))
    .sort((a, b) => b.released.localeCompare(a.released) || a.id.localeCompare(b.id));

  return (
    <div className="page-frame model-workspace lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <ModelQuickNav recipes={recipes} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
