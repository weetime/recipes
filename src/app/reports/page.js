import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPerformanceReports } from "@/lib/performance-reports";

export const metadata = {
  title: "Performance reports",
  description: "Measured model serving results across workloads and hardware.",
};

export default function PerformanceReportsPage() {
  const reports = getPerformanceReports();

  return (
    <main className="page-frame pb-24">
      <header className="border-b border-border pb-10 pt-10 lg:pb-14 lg:pt-16">
        <div className="section-label">MODEL INDEX / PERFORMANCE REPORTS</div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[.92] tracking-[-.075em]">Measured<br />on hardware.</h1>
          <p className="max-w-md text-base leading-7 text-muted-foreground">
            Benchmark reports tied to a model, checkpoint, serving stack and workload. Open the measurements, methodology and limits behind each result.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>{String(reports.length).padStart(2, "0")} REPORTS</span>
          <span>VLLM + SGLANG</span>
          <span>WORKLOAD-SPECIFIC RESULTS</span>
        </div>
      </header>

      <section aria-label="Performance reports" className="divide-y divide-border">
        {reports.map((report, index) => (
          <article key={report.slug} className="grid gap-7 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)] lg:gap-12 lg:py-10">
            <div>
              <div className="section-label">{String(index + 1).padStart(2, "0")} / {report.date} / {report.modelName}</div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{report.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{report.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {[report.hardware, report.engine, report.precision].map((item) => (
                  <span key={item} className="border border-border px-2.5 py-1.5">{item}</span>
                ))}
              </div>
              <p className="mt-5 max-w-2xl border-l-2 border-vllm-blue pl-3 text-xs leading-5 text-muted-foreground">{report.caveat}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm">
                <a href={report.href} className="inline-flex items-center gap-2 font-semibold text-vllm-blue hover:underline">
                  Open full report <ArrowUpRight size={15} />
                </a>
                <Link href={`/${report.modelId}`} className="text-muted-foreground hover:text-foreground">Model recipe ↗</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {report.highlights.map((item) => (
                <div key={item.label} className="flex min-h-28 flex-col justify-between py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0 lg:min-h-36">
                  <span className="section-label">{item.label}</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <strong className="text-3xl font-medium tracking-[-.06em] tabular-nums">{item.value}</strong>
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
