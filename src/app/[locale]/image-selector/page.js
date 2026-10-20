import { loadGpuStackImages } from "@/lib/gpustack-images";
import { gpustackConfig } from "@/lib/gpustack-images-config";
import { ImageSelector } from "@/components/recipes/ImageSelector";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: chinese ? "GPUStack 镜像选择器" : "Image Selector",
    description: chinese ? "选择 GPUStack 版本、GPU 类型、框架和推理后端，生成服务端与工作节点的镜像拉取命令。" : "Pick a GPUStack version, GPU type, framework, and inference backend — get the exact GPUStack docker pull commands for your Server and Worker nodes.",
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
    <main className="page-frame pb-20">
      <header className="border-b border-border pb-10 pt-10 lg:pb-16 lg:pt-16">
        <div className="section-label">{t("imageSelector.eyebrow")}</div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-8">
          <h1 className="text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-none tracking-[-.075em]">{t("imageSelector.headline1")}<br />{t("imageSelector.headline2")}</h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">{t("imageSelector.intro")}</p>
        </div>
      </header>
      <ImageSelector data={data} config={gpustackConfig} />
    </main>
  );
}
