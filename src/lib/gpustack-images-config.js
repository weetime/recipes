// Static vocabulary for the GPUStack Image Selector page.
//
// This is the hand-maintained half of the data — everything that is NOT derivable
// from the runner image tags (registries, GPU-vendor labels, comments, the offline
// guide). Ported from the upstream app.js `CONFIG` (English strings only; the repo
// site is English). The dynamic GPU/framework/backend matrix is derived from the
// vendored image lists in src/lib/gpustack-matrix.js.

// Registry prefixes. `overrides` remaps specific base names to their canonical
// public path (Docker Hub hosts postgres/prometheus/grafana outside the gpustack/ org).
export const registries = {
  "docker-hub": {
    name: "Docker Hub",
    prefix: "gpustack/",
    registry: "docker.io",
    overrides: { postgres: "postgres", prometheus: "prom/prometheus", grafana: "grafana/grafana" },
  },
  quay: { name: "Quay.io", prefix: "quay.io/gpustack/", registry: "quay.io" },
  china: {
    name: "China Mirror",
    prefix: "swr.cn-south-1.myhuaweicloud.com/gpustack/",
    registry: "swr.cn-south-1.myhuaweicloud.com",
  },
};

// GPU card id → acceleration framework name. The lowercased framework name is the
// prefix of the runner tag (e.g. nvidia → "cuda" → gpustack/runner:cuda13.0-...).
export const cardFrameworkMap = {
  nvidia: "CUDA",
  amd: "ROCm",
  ascend: "CANN",
  hygon: "DTK",
  mthreads: "MUSA",
  iluvatar: "CoreX",
  cambricon: "Neuware",
  maca: "MACA",
  "t-head": "HGGC",
};

// Inference engine token → display name.
export const backendNameMap = {
  vllm: "vLLM",
  sglang: "SGLang",
  mindie: "MindIE",
  voxbox: "VoxBox",
};

// GPU Type buttons, in display order. `note` renders an info tooltip; a card whose
// framework has no images for the selected GPUStack version is auto-disabled.
export const cards = [
  { id: "nvidia", label: "NVIDIA" },
  { id: "amd", label: "AMD" },
  { id: "ascend", label: "Ascend" },
  { id: "hygon", label: "Hygon" },
  { id: "mthreads", label: "MThreads" },
  { id: "iluvatar", label: "Iluvatar" },
  { id: "cambricon", label: "Cambricon", note: "Please contact Cambricon vendor for inference backend images" },
  { id: "maca", label: "MetaX" },
  { id: "t-head", label: "T-Head PPU" },
];

// docker pull --platform value per architecture (auto → omit the flag).
export const architectures = [
  { id: "amd64", label: "AMD64", platform: "linux/amd64" },
  { id: "arm64", label: "ARM64", platform: "linux/arm64" },
  { id: "auto", label: "Auto", platform: null },
];

// Optional images the user can opt into (left panel checkboxes).
export const optionalImages = [
  {
    id: "postgres",
    label: "PostgreSQL",
    hint: "External database (optional). See the GPUStack external-database guide.",
  },
  {
    id: "monitoring",
    label: "Monitoring (Prometheus + Grafana)",
    hint: "External observability stack (optional).",
  },
];

// Node-role tabs for the command block.
export const components = [
  { id: "all", label: "All" },
  { id: "server", label: "Server Node" },
  { id: "worker", label: "Worker Node" },
];

// Comment lines emitted above each image group in the generated command list.
export const comments = {
  main: "GPUStack Image - GPUStack core service, required for both Server and Worker nodes",
  runner: "Inference Backend Images",
  pause: "Pause Image - Provides shared network and IPC environment for model instance containers, required for Docker environment only",
  benchmark: "Benchmark Image - Used for running model performance benchmarks",
  postgres: "PostgreSQL - Used for independent deployment of external database (optional component)",
  monitoring: "Monitoring Suite - Includes Prometheus and Grafana (optional components)",
  gateway: "Gateway Images - Required for Kubernetes deployment only",
  k8s: "GPU Service Images - Required for Kubernetes deployment only",
};

// Bundle passed to the client component as a single `config` prop.
export const gpustackConfig = {
  registries,
  cardFrameworkMap,
  backendNameMap,
  cards,
  architectures,
  optionalImages,
  components,
  comments,
};
