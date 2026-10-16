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
    <main className="max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
      <header className="atlas-panel relative mb-8 overflow-hidden p-6 sm:p-9">
        <div className="absolute -right-16 -top-32 h-80 w-80 rounded-full bg-[#d9f5e2] blur-3xl dark:bg-[#1c5b4b]/40" aria-hidden="true" />
        <div className="relative">
          <div className="atlas-kicker">Atlas / prepare</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.05em] sm:text-5xl">Choose the right image.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Set your GPUStack version, accelerator, framework and backend. Copy the exact{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px]">docker pull</code> commands for server and worker nodes.
          </p>
        </div>
      </header>
      <ImageSelector data={data} config={gpustackConfig} />
    </main>
  );
}
