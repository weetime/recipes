const REPORTS = [
  {
    slug: "glm-5-3-flash-rtx-pro-5000",
    modelId: "zai-org/GLM-5.3-Flash",
    modelName: "GLM-5.3-Flash",
    title: "NVFP4 serving on RTX PRO 5000",
    href: "/reports/glm-5-3-flash-rtx-pro-5000/index.html",
    date: "2026-10-16",
    hardware: "8× RTX PRO 5000 · 72 GB",
    engine: "vLLM 0.31.0",
    precision: "NVFP4",
    summary: "Fixed-length throughput, multi-turn Agent replay, open-loop load, and a two-hour stability run.",
    highlights: [
      { value: "895.30", unit: "tok/s", label: "8K / 2048 · C16" },
      { value: "18 / 18", unit: "points", label: "Primary points completed" },
      { value: "2 h", unit: "run", label: "Two-hour request replay" },
    ],
    caveat: "Synthetic fixed-length throughput, multi-turn replay, and open-loop traffic are distinct workloads; interpret each result with its test profile and sample count.",
  },
];

export function getPerformanceReports() {
  return REPORTS;
}

export function getPerformanceReportsForModel(modelId) {
  return REPORTS.filter((report) => report.modelId === modelId);
}
