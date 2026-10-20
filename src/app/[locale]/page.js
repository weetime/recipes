import { Suspense } from "react";
import { getAllRecipes } from "@/lib/recipes";
import { RecipeCardGrid } from "@/components/recipes/RecipeCardGrid";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: { absolute: chinese ? "Model Recipes — 模型推理部署配方" : "Model Recipes — Deploy any model on any hardware with vLLM or SGLang" },
    description: chinese
      ? "为模型选择适配硬件，获取可运行的 vLLM 或 SGLang 服务命令。"
      : "How do I run model X on hardware Y? Pick a model, get a working serve command for vLLM or SGLang.",
    alternates: { canonical: chinese ? "/zh" : "/", languages: { en: "/", zh: "/zh" } },
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const recipes = getAllRecipes();

  return (
    <main className="max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
      {/* ── Hero ── */}
      <header className="mb-6">
        <h1 className="sr-only">{t("home.hiddenTitle")}</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          {t("home.description")} <code className="font-mono text-[12px] bg-muted/50 px-1 py-0.5 rounded">serve</code> {t("home.description2")} {" "}
          <a
            href="https://vllm.ai/#compatibility"
            target="_blank"
            rel="noopener noreferrer"
            className="text-vllm-blue hover:underline"
          >
            {t("home.compatibility")}
          </a>
        </p>
      </header>

      {/* ── Recipe catalog ── */}
      <Suspense fallback={<div className="text-sm text-muted-foreground py-8">{t("home.loading")}</div>}>
        <RecipeCardGrid recipes={recipes} />
      </Suspense>
    </main>
  );
}
