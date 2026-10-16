import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, ScanEye, Sparkles, Workflow } from "lucide-react";
import { getAllRecipes } from "@/lib/recipes";
import { loadTaxonomy } from "@/lib/taxonomy";
import { RecipeCardGrid } from "@/components/recipes/RecipeCardGrid";

export const metadata = {
  title: { absolute: "Inference Atlas — Find a model. Fit your hardware. Run it." },
  description: "A deployment workbench for vLLM and SGLang. Start with your hardware or workload, find a recipe, and generate a runnable command.",
};

const hardwareStarts = [
  { id: "h200", label: "H200", brand: "NVIDIA", tone: "bg-[#def2e7] text-[#175746] dark:bg-[#25453d] dark:text-[#a7ead0]" },
  { id: "b200", label: "B200", brand: "NVIDIA", tone: "bg-[#e5e9f7] text-[#414e87] dark:bg-[#303958] dark:text-[#c6d1ff]" },
  { id: "mi300x", label: "MI300X", brand: "AMD", tone: "bg-[#faeee3] text-[#9a562b] dark:bg-[#48382e] dark:text-[#f1c499]" },
  { id: "ascend_910b4", label: "910B4", brand: "Ascend", tone: "bg-[#f5e9eb] text-[#9f4b59] dark:bg-[#4c343d] dark:text-[#f2bdc5]" },
];

const taskStarts = [
  { id: "text", label: "Language", icon: Workflow },
  { id: "multimodal", label: "Vision", icon: ScanEye },
  { id: "omni", label: "Media", icon: Sparkles },
  { id: "embedding", label: "Embeddings", icon: Cpu },
];

export default async function HomePage() {
  const recipes = getAllRecipes();
  const hardwareCount = Object.keys(loadTaxonomy().hardware_profiles).length;
  const sglangCount = recipes.filter((recipe) => recipe.engines?.sglang).length;

  return (
    <main className="mx-auto max-w-[1480px] px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      <section className="atlas-hero grid grid-cols-[minmax(0,1fr)] gap-8 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)] lg:gap-14 lg:px-14 lg:py-16">
        <div className="flex min-w-0 flex-col items-start">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#8bc5af]/30 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9e2c6]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9ef0bd] shadow-[0_0_10px_#9ef0bd]" />
            The deployment workbench
          </div>
          <h1 className="max-w-2xl text-[clamp(2.8rem,5.4vw,5.75rem)] font-extrabold leading-[1.02] tracking-[-0.07em]">
            From model to <span className="text-[#90e5ba]">running endpoint.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#bdd2ca] sm:text-lg">
            Start with the hardware you have or the workload you need. Find a compatible recipe, tune the serving engine, and take the command to your cluster.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9ce8bb] px-5 py-3 text-sm font-bold text-[#102c29] transition-colors hover:bg-[#c5f4d6]">
              Explore all recipes <ArrowRight size={16} />
            </Link>
            <Link href="/image-selector" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#a4cbbd]/35 px-5 py-3 text-sm font-semibold text-[#e5f8ec] transition-colors hover:bg-white/10">
              Find a GPUStack image
            </Link>
          </div>
          <div className="mt-auto grid w-full grid-cols-3 gap-5 border-t border-white/15 pt-7 text-[#b7d0c7] max-lg:mt-10">
            <div><strong className="block text-2xl font-bold tracking-tight text-white">{recipes.length}</strong><span className="text-xs">model recipes</span></div>
            <div><strong className="block text-2xl font-bold tracking-tight text-white">2</strong><span className="text-xs">serving engines</span></div>
            <div><strong className="block text-2xl font-bold tracking-tight text-white">{hardwareCount}</strong><span className="text-xs">hardware profiles</span></div>
          </div>
        </div>

        <div className="min-w-0 self-center rounded-[1.5rem] border border-[#b4e2ce]/20 bg-[#f9fffa] p-5 text-[#17302c] shadow-[0_24px_75px_rgba(0,0,0,0.18)] sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#357e68]">Start your route</div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">What are you deploying on?</h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#def5e7] font-mono text-xs font-bold text-[#137257]">01</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {hardwareStarts.map((hardware) => (
              <Link key={hardware.id} href={"/browse?hw=" + hardware.id + "&panel=open"} className="group flex min-h-20 min-w-0 items-center gap-2 rounded-xl border border-[#dce8df] bg-white px-2.5 py-3 transition-all hover:-translate-y-0.5 hover:border-[#5fb394] hover:shadow-md sm:gap-3 sm:px-3">
                <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold " + hardware.tone}>{hardware.brand.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{hardware.label}</span>
                  <span className="block text-[11px] text-[#6a8277]">{hardware.brand}</span>
                </span>
                <ArrowRight size={14} className="ml-auto shrink-0 text-[#7aaca0] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
          <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#82988e]"><span className="h-px flex-1 bg-[#e1e9e2]" />or begin with a task<span className="h-px flex-1 bg-[#e1e9e2]" /></div>
          <div className="flex flex-wrap gap-2">
            {taskStarts.map(({ id, label, icon: Icon }) => (
              <Link key={id} href={"/browse?task=" + id + "&panel=open"} className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8df] bg-[#f7faf6] px-3 py-2 text-xs font-semibold text-[#3b6255] transition-colors hover:border-[#5fb394] hover:bg-[#edf8ee]">
                <Icon size={13} /> {label}
              </Link>
            ))}
          </div>
          <p className="mt-5 border-t border-[#e6eee7] pt-4 text-xs leading-5 text-[#698279]">
            {sglangCount} recipes include an SGLang path. Engine and hardware choices remain editable on every model page.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="py-12 text-sm text-muted-foreground">Loading recipes…</div>}>
        <RecipeCardGrid recipes={recipes} />
      </Suspense>
    </main>
  );
}
