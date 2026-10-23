"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, ArrowDown, ArrowUp, ArrowUpRight, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { MiniCurve } from "@/components/reports/MiniCurve";

const SORT_OPTIONS = ["newest", "model", "hardware", "32k-512-c1", "8k-256-c16", "8k-2048-c16"];
const TEST_OPTIONS = ["all", "fixed", "agent", "openLoop", "longContext", "stability", "sharegpt", "vision", "quality", "videoGeneration"];

function FilterSelect({ value, onChange, options, label, leadingIcon: LeadingIcon, direction }) {
  const id = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function handleKeyDown(event) {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) event.preventDefault();
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      setActiveIndex(selectedIndex);
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    else if (event.key === "ArrowUp") setActiveIndex((index) => Math.max(index - 1, 0));
    else if (event.key === "Home") setActiveIndex(0);
    else if (event.key === "End") setActiveIndex(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") {
      onChange(options[activeIndex]?.value);
      setOpen(false);
    }
  }

  const currentOption = options[selectedIndex] || options[0];
  const DirectionIcon = direction === "down" ? ArrowDown : direction === "up" ? ArrowUp : null;

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((wasOpen) => !wasOpen);
        }}
        onKeyDown={handleKeyDown}
        className={`flex h-10 w-full min-w-0 items-center gap-2 border border-border bg-card/40 px-3 text-left text-xs text-foreground outline-none transition-colors hover:border-foreground/35 focus-visible:border-vllm-blue focus-visible:ring-1 focus-visible:ring-vllm-blue ${open ? "border-vllm-blue" : ""}`}
      >
        {LeadingIcon && <LeadingIcon size={13} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{currentOption?.label}</span>
        {DirectionIcon && <DirectionIcon size={12} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
        <ChevronDown size={13} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-listbox`} role="listbox" aria-label={label} className="absolute inset-x-0 top-[calc(100%+4px)] z-40 max-h-72 overflow-y-auto border border-border bg-card p-1 shadow-xl shadow-black/20">
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <div
                id={`${id}-option-${index}`}
                key={option.value}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`flex min-h-9 cursor-pointer items-center gap-2 px-2.5 py-2 text-xs transition-colors ${active ? "bg-vllm-blue/10 text-foreground" : "text-muted-foreground hover:bg-foreground/[.04] hover:text-foreground"}`}
              >
                <Check size={13} className={`shrink-0 text-vllm-blue ${selected ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PerformanceReportList({ reports }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [model, setModel] = useState("all");
  const [hardware, setHardware] = useState("all");
  const [engine, setEngine] = useState("all");
  const [precision, setPrecision] = useState("all");
  const [test, setTest] = useState("all");
  const [sort, setSort] = useState("newest");
  const engines = useMemo(() => [...new Set(reports.map((report) => report.engine))].sort(), [reports]);
  const modelNames = useMemo(() => [...new Set(reports.map((report) => report.modelName))].sort(), [reports]);
  const hardwareModels = useMemo(() => [...new Set(reports.map((report) => report.hardwareName))].sort(), [reports]);
  const precisions = useMemo(() => [...new Set(reports.map((report) => report.precision))].sort(), [reports]);
  const sortCounts = useMemo(() => Object.fromEntries(SORT_OPTIONS.slice(3).map((key) => [key, reports.filter((report) => Number.isFinite(report.benchmarks[key])).length])), [reports]);
  const modelOptions = useMemo(() => [{ value: "all", label: t("reports.allModels") }, ...modelNames.map((item) => ({ value: item, label: item }))], [modelNames, t]);
  const hardwareOptions = useMemo(() => [{ value: "all", label: t("reports.allHardware") }, ...hardwareModels.map((item) => ({ value: item, label: item }))], [hardwareModels, t]);
  const engineOptions = useMemo(() => [{ value: "all", label: t("reports.allEngines") }, ...engines.map((item) => ({ value: item, label: item }))], [engines, t]);
  const precisionOptions = useMemo(() => [{ value: "all", label: t("reports.allPrecisions") }, ...precisions.map((item) => ({ value: item, label: item }))], [precisions, t]);
  const testOptions = useMemo(() => TEST_OPTIONS.map((option) => ({ value: option, label: option === "all" ? t("reports.allWorkloads") : t(`reports.tests.${option}`) })), [t]);
  const sortOptions = useMemo(() => SORT_OPTIONS.map((option) => ({
    value: option,
    label: ["newest", "model", "hardware"].includes(option) ? t(`reports.sort.${option}`) : t(`reports.sort.${option}`, { count: sortCounts[option] }),
  })), [sortCounts, t]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = reports.filter((report) => {
      const matchesQuery = !needle || [report.modelName, report.modelId, report.hardware, report.topology, report.engine, report.precision, report.summary, ...report.testLabels].join(" ").toLowerCase().includes(needle);
      return matchesQuery
        && (model === "all" || report.modelName === model)
        && (hardware === "all" || report.hardwareName === hardware)
        && (engine === "all" || report.engine === engine)
        && (precision === "all" || report.precision === precision)
        && (test === "all" || report.testIds.includes(test));
    });
    return result.sort((a, b) => {
      if (sort === "newest") return b.date.localeCompare(a.date) || a.modelName.localeCompare(b.modelName);
      if (sort === "model") return a.modelName.localeCompare(b.modelName) || a.date.localeCompare(b.date);
      if (sort === "hardware") return a.hardwareName.localeCompare(b.hardwareName) || a.date.localeCompare(b.date);
      return (b.benchmarks[sort] ?? -Infinity) - (a.benchmarks[sort] ?? -Infinity);
    });
  }, [reports, query, model, hardware, engine, precision, test, sort]);

  return (
    <section aria-label={t("reports.navLabel")} className="pt-6">
      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(120px,.7fr))_minmax(190px,1fr)]">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("reports.searchPlaceholder")} aria-label={t("reports.searchPlaceholder")} className="h-10 w-full border border-border bg-card/40 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-vllm-blue" />
        </label>
        <FilterSelect value={model} onChange={setModel} options={modelOptions} label={t("reports.modelFilter")} />
        <FilterSelect value={hardware} onChange={setHardware} options={hardwareOptions} label={t("reports.hardwareFilter")} />
        <FilterSelect value={engine} onChange={setEngine} options={engineOptions} label={t("reports.engineFilter")} />
        <FilterSelect value={precision} onChange={setPrecision} options={precisionOptions} label={t("reports.precisionFilter")} />
        <FilterSelect value={test} onChange={setTest} options={testOptions} label={t("reports.workloadFilter")} />
        <FilterSelect value={sort} onChange={setSort} options={sortOptions} label={t("reports.sortBy")} leadingIcon={SlidersHorizontal} direction={sort === "newest" ? "down" : sort.startsWith("32k") || sort.startsWith("8k") ? "up" : undefined} />
      </div>

      <div className="mb-2 flex items-center justify-between border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">
        <span>{t("reports.matchCount", { count: filtered.length, total: reports.length })}</span>
        <span className="hidden md:inline">{t("reports.sortScope")}</span>
      </div>

      {filtered.length === 0 ? <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">{t("reports.noMatches")}</p> : (
        <div>
          {filtered.map((report, index) => (
            <article key={report.slug} className="grid gap-x-8 gap-y-5 border-b border-border py-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(260px,.72fr)_minmax(300px,.85fr)] lg:items-center lg:py-7">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 font-mono text-[10px] text-muted-foreground">
                  <span className="text-vllm-blue">{String(index + 1).padStart(2, "0")}</span>
                  <span>{report.date}</span><span className="text-border">/</span><span>{report.engine}</span>
                </div>
                <h2 className="text-xl font-semibold tracking-[-.045em] sm:text-2xl">
                  <a href={report.href} className="group inline-flex flex-wrap items-center gap-x-2 hover:text-vllm-blue">
                    <span>{report.modelName}</span><span className="text-muted-foreground/60">×</span><span>{report.hardwareName}</span><ArrowUpRight size={16} className="text-vllm-blue opacity-70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{report.summary}</p>
                <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[10px] text-foreground/80">
                  <span className="border border-border px-2 py-1">{report.hardware}</span>
                  <span className="border border-border px-2 py-1">{report.precision}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="font-mono uppercase tracking-wider text-muted-foreground/80">{t("reports.topology")}</span>
                  <span>{report.topology || t("reports.topologyInReport")}</span>
                </div>
              </div>

              <div className="min-w-0 lg:border-l lg:border-border lg:pl-6">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[.1em] text-muted-foreground">{t("reports.testCoverage")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {report.testIds.map((id, testIndex) => <span key={`${id}-${testIndex}`} className="border border-border bg-foreground/[.025] px-2 py-1 text-[10px] text-foreground/80">{t.has(`reports.tests.${id}`) ? t(`reports.tests.${id}`) : report.testLabels[testIndex]}</span>)}
                </div>
                <a href={report.href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-vllm-blue hover:underline">{t("reports.read")} <ArrowUpRight size={13} /></a>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(120px,.72fr)_minmax(160px,1fr)] lg:border-l lg:border-border lg:pl-6">
                <div className="flex flex-col justify-between border-y border-border py-2.5 sm:border-y-0 sm:py-0">
                  <div className="text-[10px] leading-4 text-muted-foreground">{report.listMetric?.label || t("reports.singleStream")}</div>
                  {(report.listMetric || report.singleStream) && <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground/80" title={(report.listMetric || report.singleStream).profile}>{(report.listMetric || report.singleStream).profile}</div>}
                  <div className="mt-2 flex items-baseline gap-1.5">
                    {report.listMetric || report.singleStream ? <><span className="text-2xl font-medium tracking-[-.045em] tabular-nums">{Number((report.listMetric || report.singleStream).value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span><span className="text-[10px] text-muted-foreground">{(report.listMetric || report.singleStream).unit}</span></> : <span className="text-sm text-muted-foreground">{t("reports.singleUnavailable")}</span>}
                  </div>
                </div>
                <MiniCurve curve={report.curve} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
