import { loadGpuStackImages } from "@/lib/gpustack-images";
import { gpustackConfig } from "@/lib/gpustack-images-config";
import { ImageSelector } from "@/components/recipes/ImageSelector";

export const metadata = {
  title: "Image Selector",
  description:
    "Pick a GPUStack version, GPU type, framework, and inference backend — get the exact GPUStack docker pull commands for your Server and Worker nodes.",
};

export default function ImageSelectorPage() {
  // Server-side: read the vendored GPUStack image lists; pass them + the static
  // config to the client component, which derives the matrix and renders commands.
  const data = loadGpuStackImages();

  return (
    <main className="page-frame pb-20">
      <header className="border-b border-border pb-10 pt-10 lg:pb-16 lg:pt-16">
        <div className="section-label">IMAGE REFERENCE / GPUSTACK</div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-8">
          <h1 className="text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-none tracking-[-.075em]">Choose your<br />image set.</h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">Select the accelerator and runtime. Copy the exact images for the server and worker nodes.</p>
        </div>
      </header>
      <ImageSelector data={data} config={gpustackConfig} />
    </main>
  );
}
