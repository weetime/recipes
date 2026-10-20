import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { getPerformanceReports } from "@/lib/performance-reports";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: chinese ? "性能报告" : "Performance reports",
    description: chinese ? "按工作负载和硬件记录的模型服务实测结果。" : "Measured model serving results across workloads and hardware.",
    alternates: { canonical: chinese ? "/zh/reports" : "/reports", languages: { en: "/reports", zh: "/zh/reports" } },
  };
}

export default async function PerformanceReportsPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const reports = getPerformanceReports();

  return (
    <main className="max-w-[1360px] mx-auto px-4 sm:px-6 pb-24">
      <header className="border-b border-border pb-10 pt-10 lg:pb-14 lg:pt-16">
        <div className="font-mono text-[11px] tracking-[.12em] text-muted-foreground">{t("reports.eyebrow")}</div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[.92] tracking-[-.075em]">{t("reports.title")}</h1>
          <p className="max-w-md text-base leading-7 text-muted-foreground">
            {t("reports.description")}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
          <span>{String(reports.length).padStart(2, "0")} {t("reports.count")}</span>
          <span>VLLM + SGLANG</span>
          <span>{t("reports.scope")}</span>
        </div>
      </header>

      <section aria-label="Performance reports" className="divide-y divide-border">
        {reports.map((report, index) => (
          <article key={report.slug} className="grid gap-7 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,.9fr)] lg:gap-12 lg:py-10">
            <div>
              <div className="font-mono text-[10px] tracking-[.1em] text-muted-foreground">{String(index + 1).padStart(2, "0")} / {report.date} / {report.modelName}</div>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{report.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{report.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px]">
                {[report.hardware, report.engine, report.precision].map((item) => (
                  <span key={item} className="border border-border px-2.5 py-1.5">{item}</span>
                ))}
              </div>
              <p className="mt-5 max-w-2xl border-l-2 border-vllm-blue pl-3 text-xs leading-5 text-muted-foreground">{report.caveat}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5 text-sm">
                <a href={report.href} className="inline-flex items-center gap-2 font-semibold text-vllm-blue hover:underline">
                  {t("reports.open")} <ArrowUpRight size={15} />
                </a>
                <Link href={`/${report.modelId}`} className="text-muted-foreground hover:text-foreground">{t("reports.modelRecipe")}</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {report.highlights.map((item) => (
                <div key={item.label} className="flex min-h-28 flex-col justify-between py-4 sm:px-4 sm:first:pl-0 sm:last:pr-0 lg:min-h-36">
                  <span className="font-mono text-[10px] tracking-[.08em] text-muted-foreground">{item.label}</span>
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
