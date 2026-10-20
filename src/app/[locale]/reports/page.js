import { getPerformanceReports } from "@/lib/performance-reports";
import { getTranslations } from "next-intl/server";
import { PerformanceReportList } from "@/components/reports/PerformanceReportList";

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
  const reports = getPerformanceReports(locale);

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

      <PerformanceReportList reports={reports} />
    </main>
  );
}
