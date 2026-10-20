import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { getPerformanceReports } from "@/lib/performance-reports";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const chinese = locale === "zh";
  return {
    title: chinese ? "模型性能报告" : "Performance reports",
    description: chinese ? "不同工作负载和硬件上的模型服务实测结果。" : "Measured model serving results across workloads and hardware.",
    alternates: { canonical: chinese ? "/zh/reports" : "/reports", languages: { en: "/reports", zh: "/zh/reports" } },
  };
}

export default async function PerformanceReportsPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const reports = getPerformanceReports();

  return (
    <main className="page-frame pb-24">
      <header className="border-b border-border pb-7 pt-10 lg:pb-9 lg:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <div className="mb-3 font-mono text-xs tracking-[.12em] text-muted-foreground">{t("reports.eyebrow")}</div>
            <h1 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{t("reports.title")}</h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {t("reports.description")}
          </p>
        </div>
        <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2 border-t border-border pt-3 font-mono text-[11px] tracking-wide text-muted-foreground">
          <span><strong className="font-medium text-foreground">{String(reports.length).padStart(2, "0")}</strong> {t("reports.count")}</span>
          <span>vLLM · SGLANG</span>
          <span>{t("reports.scope")}</span>
        </div>
      </header>

      <section aria-label={t("reports.navLabel")}>
        <div className="hidden grid-cols-[minmax(0,1fr)_minmax(390px,.88fr)] gap-10 border-b border-border py-3 font-mono text-[10px] tracking-[.1em] text-muted-foreground lg:grid">
          <span>{t("reports.reportConfiguration")}</span>
          <span className="grid grid-cols-3 gap-4"><span>{t("reports.result")}</span><span>{t("reports.testCoverage")}</span><span>{t("reports.additionalPoint")}</span></span>
        </div>
        {reports.map((report, index) => (
          <article key={report.slug} className="grid gap-5 border-b border-border py-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(390px,.88fr)] lg:items-center lg:gap-10">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span className="text-vllm-blue">{String(index + 1).padStart(2, "0")}</span>
                <span>{report.date}</span>
                <span className="hidden text-border sm:inline">/</span>
                <span>{report.modelName}</span>
              </div>
              <h2 className="text-xl font-medium tracking-[-.035em] sm:text-2xl">{report.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{report.summary}</p>
              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{report.hardware}</span><span aria-hidden="true">·</span>
                <span>{report.engine}</span><span aria-hidden="true">·</span>
                <span>{report.precision}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <a href={report.href} className="inline-flex items-center gap-1.5 font-medium text-vllm-blue hover:underline">
                  {t("reports.read")} <ArrowUpRight size={14} />
                </a>
                <Link href={`/${report.modelId}`} className="text-muted-foreground hover:text-foreground">{t("reports.model")}</Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 border-y border-border lg:border-y-0">
              {report.highlights.map((item, metricIndex) => (
                <div key={item.label} className={`flex min-h-[82px] flex-col justify-between py-3 pr-2 ${metricIndex > 0 ? "border-l border-border pl-3 sm:pl-4" : ""}`}>
                  <dt className="text-[10px] leading-4 text-muted-foreground sm:text-[11px]">{item.label}</dt>
                  <dd className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="text-lg font-medium tracking-[-.04em] tabular-nums sm:text-xl">{item.value}</span>
                    <span className="text-[10px] text-muted-foreground">{item.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
