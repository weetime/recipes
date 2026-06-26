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
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Image Selector</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your GPUStack version, GPU type, framework, and inference backends to get the exact{" "}
          <code className="font-mono text-[12px] bg-muted/50 px-1 py-0.5 rounded">docker pull</code> commands.
        </p>
      </header>
      <ImageSelector data={data} config={gpustackConfig} />
    </main>
  );
}
