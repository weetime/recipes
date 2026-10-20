import { loadGpuStackImages } from "@/lib/gpustack-images";
import { gpustackConfig } from "@/lib/gpustack-images-config";
import { ImageSelector } from "@/components/recipes/ImageSelector";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: chinese ? "镜像选择器" : "Image Selector",
    description: chinese
      ? "选择 GPUStack 版本、GPU、框架与推理后端，生成 Server 和 Worker 节点对应的 Docker 拉取命令。"
      : "Pick a GPUStack version, GPU type, framework, and inference backend — get the exact GPUStack docker pull commands for your Server and Worker nodes.",
    alternates: { canonical: chinese ? "/zh/image-selector" : "/image-selector", languages: { en: "/image-selector", zh: "/zh/image-selector" } },
  };
}

export default async function ImageSelectorPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  // Server-side: read the vendored GPUStack image lists; pass them + the static
  // config to the client component, which derives the matrix and renders commands.
  const data = loadGpuStackImages();

  return (
    <main className="max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">{t("imageSelector.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("imageSelector.description")}{" "}
          <code className="font-mono text-[12px] bg-muted/50 px-1 py-0.5 rounded">docker pull</code> {t("imageSelector.commands")}
        </p>
      </header>
      <ImageSelector data={data} config={gpustackConfig} />
    </main>
  );
}
