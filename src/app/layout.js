import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchBox } from "@/components/recipes/SearchBox";
import CommunityModal from "@/components/CommunityModal";
import { getAllRecipes } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";
import { buildOrganizationLd, buildWebSiteLd, jsonLdScript } from "@/lib/jsonld";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const defaultOgUrl = "/og?title=" + encodeURIComponent("Model Index")
  + "&subtitle=" + encodeURIComponent("Find a model. Fit your hardware. Run it.");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Model Index",
    template: "%s | Model Index",
  },
  description: "Find deployment recipes for your hardware and workload, then configure a vLLM or SGLang serve command.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Model Index",
    title: "Model Index",
    description: "A model deployment workbench for vLLM and SGLang.",
    images: [{ url: defaultOgUrl, width: 1200, height: 630, alt: "Model Index" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Index",
    description: "Find a model. Fit your hardware. Run it.",
    images: [defaultOgUrl],
  },
  alternates: { canonical: siteUrl },
};

export default async function RootLayout({ children }) {
  const recipes = getAllRecipes();
  const searchRecipes = recipes.map((r) => ({
    hf_org: r.hf_org,
    hf_repo: r.hf_repo,
    hf_id: r.hf_id,
    hf_released: r.hf_released,
    meta: {
      title: r.meta.title,
      provider: r.meta.provider,
      description: r.meta.description,
      date_added: r.meta.date_added,
      date_updated: r.meta.date_updated,
      tasks: r.meta.tasks,
      hardware: r.meta.hardware || {},
    },
    model: {
      architecture: r.model.architecture,
      parameter_count: r.model.parameter_count,
    },
    precisions: [...new Set(
      Object.values(r.variants || {}).map((v) => v?.precision).filter(Boolean)
    )],
  }));

  const siteGraph = {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationLd(), buildWebSiteLd()],
  };

  return (
    <html lang="en" className={inter.variable + " " + jetbrainsMono.variable + " dark"} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')!=='light')}catch{}",
          }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={jsonLdScript(siteGraph)}
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <div className="page-frame flex items-center gap-6 py-4">
            <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold uppercase tracking-[-.06em]" aria-label="Model Index home">
              <span className="inline-block h-5 w-2 bg-vllm-blue" /> MODEL INDEX<span className="text-vllm-blue">.</span>
            </Link>
            <nav aria-label="Primary navigation" className="hidden items-center gap-8 border-l border-border pl-7 text-sm font-medium lg:flex">
              <Link href="/browse" className="hover:text-vllm-blue">Models</Link>
              <Link href="/image-selector" className="hover:text-vllm-blue">Images</Link>
              <Link href="/reports" className="hover:text-vllm-blue">Reports</Link>
            </nav>

            <div className="ml-auto hidden w-full max-w-md md:block">
              <SearchBox recipes={searchRecipes} />
            </div>

            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <a href="https://github.com/weetime/recipes" target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground xl:inline-flex">
                GitHub <ArrowUpRight size={13} />
              </a>
              <ThemeToggle />
            </div>
          </div>
          <div className="mx-auto flex max-w-[1480px] items-center gap-3 border-t border-border/70 px-4 py-2 sm:px-6 md:hidden">
            <nav aria-label="Mobile navigation" className="flex shrink-0 gap-3 text-xs font-semibold">
              <Link href="/browse" className="text-vllm-blue">Catalog</Link>
              <Link href="/image-selector" className="text-muted-foreground">Images</Link>
              <Link href="/reports" className="text-muted-foreground">Reports</Link>
            </nav>
            <div className="min-w-0 flex-1"><SearchBox recipes={searchRecipes} /></div>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-20 border-t border-border">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="text-lg font-bold uppercase tracking-[-.06em]">MODEL INDEX<span className="text-vllm-blue">.</span></div>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                A practical route from model and hardware to a runnable command. Recipes are community maintained; serving engines include vLLM and SGLang.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Built from the open vLLM Recipes catalog.</p>
            </div>
            <div className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm text-muted-foreground lg:max-w-[420px]">
              <Link href="/browse" className="hover:text-foreground">Browse recipes</Link>
              <Link href="/image-selector" className="hover:text-foreground">Image selector</Link>
              <Link href="/reports" className="hover:text-foreground">Performance reports</Link>
              <a href="/models.json" className="hover:text-foreground">JSON API</a>
              <a href="https://docs.vllm.ai" className="hover:text-foreground">vLLM docs</a>
              <a href="https://github.com/weetime/recipes/issues" className="hover:text-foreground">Request a recipe</a>
              <CommunityModal />
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
