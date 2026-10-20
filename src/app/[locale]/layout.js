import { Inter, JetBrains_Mono } from "next/font/google";
import { Link } from "@/i18n/navigation";
import { Analytics } from "@vercel/analytics/next";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { SearchBox } from "@/components/recipes/SearchBox";
import { getAllRecipes } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";
import {
  buildOrganizationLd,
  buildWebSiteLd,
  jsonLdScript,
} from "@/lib/jsonld";
import { notFound } from "next/navigation";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";

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

const siteMetadata = {
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

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    ...siteMetadata,
    description: chinese
      ? "为模型和目标硬件查找推理配方，并生成 vLLM 或 SGLang 服务命令。"
      : siteMetadata.description,
    openGraph: {
      ...siteMetadata.openGraph,
      locale: chinese ? "zh_CN" : "en_US",
      url: chinese ? `${siteUrl}/zh` : siteUrl,
    },
    alternates: {
      canonical: chinese ? `${siteUrl}/zh` : siteUrl,
      languages: { en: siteUrl, zh: `${siteUrl}/zh` },
    },
  };
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [t, messages] = await Promise.all([
    getTranslations({ locale }),
    getMessages({ locale }),
  ]);
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

  // Sitewide JSON-LD graph. Per-page schemas reference these by @id so search
  // engines and AI assistants can stitch the three vLLM properties (vllm.ai,
  // docs.vllm.ai, recipes.vllm.ai) into one Organization-rooted graph.
  const siteGraph = {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationLd(), buildWebSiteLd()],
  };

  return (
    <html lang={locale === "zh" ? "zh-CN" : defaultLocale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={jsonLdScript(siteGraph)}
        />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
        {/* Global header */}
        <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity group shrink-0" aria-label={t("nav.home")}>
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
              <Link href="/image-selector" className="hover:text-foreground transition-colors hidden sm:inline">{t("nav.imageSelector")}</Link>
              <Link href="/browse" className="hover:text-foreground transition-colors hidden sm:inline">{t("nav.browse")}</Link>
              <Link href="/reports" className="hover:text-foreground transition-colors hidden sm:inline">{t("nav.performance")}</Link>
              <a href="https://docs.vllm.ai" className="hover:text-foreground transition-colors hidden sm:inline">{t("nav.docs")}</a>
              <a href="https://github.com/weetime/recipes" className="hover:text-foreground transition-colors hidden sm:inline">{t("nav.github")}</a>
              <LanguageSwitcher locale={locale} label={t("nav.switchLanguage")} />
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
          <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-5 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="https://github.com/weetime/recipes" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="https://github.com/weetime/recipes/issues" className="hover:text-foreground transition-colors">{t("footer.request")}</a>
              <a href="https://docs.vllm.ai" className="hover:text-foreground transition-colors">{t("footer.documentation")}</a>
              <a href="https://vllm.ai/#compatibility" className="hover:text-foreground transition-colors">{t("footer.hardware")}</a>
              <a href="https://vllm.ai/#quick-start" className="hover:text-foreground transition-colors">{t("footer.install")}</a>
              <a href="/models.json" className="hover:text-foreground transition-colors">JSON API</a>
            </div>
            {/* Community QR — WeChat group. Black-on-white QR needs a white plate to stay scannable in dark mode. */}
            <div className="mt-4 flex items-center gap-3">
              <img
                src="/community-qr.png"
                alt="微信交流群二维码"
                width={60}
                height={60}
                className="rounded-md border border-border bg-white p-1 shrink-0"
              />
              <div className="leading-tight">
                <div className="text-foreground font-medium">{t("footer.community")}</div>
                <div>{t("footer.communityHint")}</div>
              </div>
            </div>
          </div>
        </footer>
        <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
