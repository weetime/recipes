import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SearchBox } from "@/components/recipes/SearchBox";
import { getAllRecipes } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";
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

const defaultOgUrl = `/og?title=${encodeURIComponent("Model Recipes")}&subtitle=${encodeURIComponent("Deploy any model on any hardware")}`;

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Model Recipes",
    template: "%s | Model Recipes",
  },
  description: "Deploy any model on any hardware with vLLM or SGLang. Interactive command builder for model serving.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Model Recipes",
    title: "Model Recipes",
    description: "Deploy any model on any hardware with vLLM or SGLang. Interactive command builder for model serving.",
    images: [{ url: defaultOgUrl, width: 1200, height: 630, alt: "Model Recipes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Recipes",
    description: "Deploy any model on any hardware with vLLM or SGLang.",
    images: [defaultOgUrl],
  },
  alternates: { canonical: siteUrl },
};

export default async function RootLayout({ children }) {
  // Recipes are small (~50 KB) — fine to load into every page for the
  // global search box. Server-rendered, cached across requests.
  const recipes = getAllRecipes();
  // Drop the heavy `guide` field before sending to the client
  const searchRecipes = recipes.map((r) => ({
    hf_org: r.hf_org,
    hf_repo: r.hf_repo,
    hf_id: r.hf_id,
    hf_released: r.hf_released,
    meta: {
      title: r.meta.title,
      provider: r.meta.provider,
      description: r.meta.description,
      tasks: r.meta.tasks,
      hardware: r.meta.hardware || {},
    },
    model: {
      architecture: r.model.architecture,
      parameter_count: r.model.parameter_count,
    },
  }));

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        {/* Global header */}
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group shrink-0" aria-label="Model Recipes — home">
              {/* Engine-neutral mark: a hexagon "hub" with a center node. The
                  sky→indigo gradient is theme-independent (reads on light and
                  dark); the wordmark below uses text tokens so it adapts. We
                  dropped the vLLM wordmark here because the site is now
                  multi-engine (vLLM + SGLang, extensible). */}
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0" aria-hidden="true">
                <defs>
                  <linearGradient id="mr-mark" x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <polygon
                  points="16,1.5 28.4,8.75 28.4,23.25 16,30.5 3.6,23.25 3.6,8.75"
                  stroke="url(#mr-mark)" strokeWidth="2.5" strokeLinejoin="round"
                />
                <polygon
                  points="16,10.5 20.76,13.25 20.76,18.75 16,21.5 11.24,18.75 11.24,13.25"
                  fill="url(#mr-mark)"
                />
              </svg>
              <span className="text-base leading-none">
                <span className="text-muted-foreground font-normal">Model </span>
                <span className="font-semibold group-hover:text-vllm-blue transition-colors">Recipes</span>
              </span>
            </Link>

            {/* Search — flex-1 so it expands to fill available space */}
            <div className="flex-1 flex justify-center max-w-xl mx-auto">
              <SearchBox recipes={searchRecipes} />
            </div>

            <nav className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              <Link href="/browse" className="hover:text-foreground transition-colors hidden sm:inline">Browse</Link>
              <a href="https://docs.vllm.ai" className="hover:text-foreground transition-colors hidden sm:inline">Docs</a>
              <a href="https://github.com/vllm-project/recipes" className="hover:text-foreground transition-colors hidden sm:inline">GitHub</a>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Global footer */}
        <footer className="border-t border-border mt-auto">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-5 text-xs text-muted-foreground flex flex-wrap gap-x-5 gap-y-2">
            <a href="https://github.com/vllm-project/recipes" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="https://github.com/vllm-project/recipes/issues" className="hover:text-foreground transition-colors">Request a recipe</a>
            <a href="https://docs.vllm.ai" className="hover:text-foreground transition-colors">Documentation</a>
            <a href="https://vllm.ai/#compatibility" className="hover:text-foreground transition-colors">Supported Models & Hardware</a>
            <a href="https://vllm.ai/#quick-start" className="hover:text-foreground transition-colors">Install vLLM</a>
            <a href="/models.json" className="hover:text-foreground transition-colors">JSON API</a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
