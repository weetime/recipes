"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Layers, Cpu, X, ArrowDownUp, Type, Eye, Sparkles, Hash, SlidersHorizontal, ChevronDown, Search } from "lucide-react";
import { getProviderDisplayName } from "@/lib/providers";
import { searchRecipes } from "@/lib/search";

// Per-row decorations: icon (tasks/arch) or colored dot (precision/hardware).
// Color is family-grouped — precision tiers, GPU brands — so the eye can
// scan a row by hue without reading every label.
const TASK_META = {
  text:       { icon: Type,     iconClass: "text-sky-500 dark:text-sky-400" },
  multimodal: { icon: Eye,      iconClass: "text-violet-500 dark:text-violet-400" },
  omni:       { icon: Sparkles, iconClass: "text-amber-500 dark:text-amber-400" },
  embedding:  { icon: Hash,     iconClass: "text-cyan-500 dark:text-cyan-400" },
};
const ARCH_META = {
  moe:   { icon: Layers, iconClass: "text-violet-500 dark:text-violet-400", label: "MoE" },
  dense: { icon: Cpu,    iconClass: "text-sky-500 dark:text-sky-400",       label: "Dense" },
};
// Precision dot — colored by precision tier so `bf16/fp8/fp4/int*` form
// visually distinct families. The three FP4 variants (plain / NVIDIA /
// Microscaling) share a warm-magenta family but hue-shift between
// pink/fuchsia/rose so a quick scan can tell them apart — they were
// indistinguishable when all three sat on the same pink. Same logic for
// INT8 vs INT4 in the emerald family.
const PRECISION_DOT = {
  bf16:  "w-2 h-2 bg-blue-500",
  fp8:   "w-2 h-2 bg-amber-500",
  mxfp8: "w-2 h-2 bg-orange-500",
  fp4:   "w-2 h-2 bg-pink-500",
  nvfp4: "w-2 h-2 bg-fuchsia-500",
  mxfp4: "w-2 h-2 bg-rose-500",
  int8:  "w-2 h-2 bg-emerald-500",
  int4:  "w-2 h-2 bg-green-600",
  "int2/4/8": "w-2 h-2 bg-lime-600",
};
// "120B" -> 120, "1.2B" -> 1.2, "1T" -> 1000, "" -> 0.
// `parameter_count` is a free-form string in YAMLs; this normalises to
// billions for sorting and bucket assignment.
function paramsToB(s) {
  if (!s || typeof s !== "string") return 0;
  const m = s.trim().match(/^([\d.]+)\s*([BTM])?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = (m[2] || "B").toUpperCase();
  if (u === "T") return n * 1000;
  if (u === "M") return n / 1000;
  return n;
}

// Bucket boundaries (in billions). Order matters — first match wins.
// `dot` grows from xs→xl so the chip's leading mark itself tells you the
// bucket size at a glance — bigger model, bigger dot. Saturation also
// climbs so xl reads strongest. All dots stay in the vllm-blue family
// to avoid competing with the precision row's family colors.
const SIZE_BUCKETS = [
  { id: "xs", label: "<10B",     test: (b) => b > 0 && b < 10,           dot: "w-1.5 h-1.5 bg-vllm-blue/40" },
  { id: "s",  label: "10–70B",   test: (b) => b >= 10 && b < 70,         dot: "w-2 h-2 bg-vllm-blue/55" },
  { id: "m",  label: "70–200B",  test: (b) => b >= 70 && b < 200,        dot: "w-2.5 h-2.5 bg-vllm-blue/70" },
  { id: "l",  label: "200B–1T",  test: (b) => b >= 200 && b < 1000,      dot: "w-3 h-3 bg-vllm-blue/85" },
  { id: "xl", label: "≥1T",      test: (b) => b >= 1000,                 dot: "w-3.5 h-3.5 bg-vllm-blue" },
];

const TASK_OPTIONS = ["text", "multimodal", "omni", "embedding"];
const ARCH_OPTIONS = ["moe", "dense"];
const PRECISION_OPTIONS = ["bf16", "fp8", "fp4", "nvfp4", "mxfp4", "int4", "int8"];
// Hardware grouped by brand — rendered as stacked sub-rows under the
// Hardware filter so the visual separation is unambiguous. Single source
// of truth: HARDWARE_BY_ID is derived from this for lookups elsewhere
// (active-filter pills, result rows).
// Brand logos live in the committed public/hardware-logos/ (Simple Icons SVGs).
// Niche domestic brands without an available logo omit `logo` and fall back to a
// monogram (see the Hardware filter row).
const HW_BRANDS = [
  {
    name: "NVIDIA",
    logo: "/hardware-logos/nvidia.svg",
    items: [
      { id: "h100", label: "H100" },
      { id: "h200", label: "H200" },
      { id: "b200", label: "B200" },
      { id: "b300", label: "B300" },
      { id: "gb200", label: "GB200" },
      { id: "gb300", label: "GB300" },
      { id: "dgx_station_gb300", label: "DGX Station" },
    ],
  },
  {
    name: "AMD",
    logo: "/hardware-logos/amd.svg",
    items: [
      { id: "mi300x", label: "MI300X" },
      { id: "mi325x", label: "MI325X" },
      { id: "mi355x", label: "MI355X" },
    ],
  },
  {
    name: "Google",
    logo: "/hardware-logos/google.svg",
    items: [
      { id: "trillium", label: "TPU v6e" },
      { id: "ironwood", label: "TPU v7" },
    ],
  },
  {
    name: "Intel",
    logo: "/hardware-logos/intel.svg",
    items: [
      { id: "xeon6", label: "Xeon 6" },
      { id: "xeon5", label: "Xeon 5" },
    ],
  },
  // Domestic (China) accelerators. Profiles + per-recipe support live in
  // taxonomy.yaml / meta.hardware. Brands without a Simple Icons logo render a
  // monogram fallback.
  {
    name: "Huawei",
    logo: "/hardware-logos/huawei.svg",
    items: [
      { id: "ascend_910b", label: "Ascend 910B" },
      { id: "ascend_910b4", label: "Ascend 910B4" },
      { id: "ascend_910c", label: "Ascend 910C" },
    ],
  },
  {
    name: "Cambricon",
    items: [{ id: "cambricon_mlu590", label: "MLU590" }],
  },
  {
    name: "Hygon",
    items: [{ id: "hygon_k100ai", label: "K100AI" }],
  },
  {
    name: "Iluvatar",
    items: [{ id: "iluvatar_biv150", label: "BI-V150" }],
  },
  {
    name: "Kunlunxin",
    items: [{ id: "kunlun_p800", label: "P800" }],
  },
  {
    // T-Head is Alibaba's chip arm; surfaced under the Alibaba brand.
    name: "Alibaba",
    logo: "/hardware-logos/alibaba.svg",
    items: [{ id: "thead_ppu_810e", label: "PPU 810E" }],
  },
];

const HARDWARE_BRAND_LOGOS = Object.fromEntries(HW_BRANDS.map((brand) => [brand.name, brand.logo]));

const HARDWARE_BY_ID = Object.fromEntries(
  HW_BRANDS.flatMap((b) => b.items.map((it) => [it.id, it]))
);

const SORT_OPTIONS = [
  { id: "released", label: "Newest" },
  { id: "updated", label: "Recently updated" },
  { id: "size_desc", label: "Largest" },
  { id: "size_asc", label: "Smallest" },
  { id: "name", label: "Name" },
];

function matchingVariant(recipe, precision, hardware) {
  const matches = recipe.variants.filter((variant) =>
    (!precision || variant.precision === precision)
    && (!hardware || variant.hardware.includes(hardware))
  );
  return matches.find((variant) => variant.key === "default") || matches[0];
}

export function BrowseList({ recipes, hardwareOptions }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hardwareById = useMemo(
    () => Object.fromEntries(hardwareOptions.map((option) => [option.id, option])),
    [hardwareOptions],
  );
  const hardwareBrands = useMemo(() => {
    const groups = new Map();
    for (const option of hardwareOptions) {
      if (!groups.has(option.brand)) groups.set(option.brand, []);
      groups.get(option.brand).push(option);
    }
    return [...groups].map(([name, items]) => ({ name, items, logo: HARDWARE_BRAND_LOGOS[name] }));
  }, [hardwareOptions]);

  // Single useMemo so the Sets keep stable identity across renders. Each row
  // holds at most one choice, including when opening an older multi-select URL.
  const { tasks, archs, sizes, precisions, hardware, engine, provider, sort, q } = useMemo(() => {
    const setOf = (k) => new Set((searchParams.get(k) || "").split(",").filter(Boolean).slice(0, 1));
    return {
      tasks: setOf("task"),
      archs: setOf("arch"),
      sizes: setOf("size"),
      precisions: setOf("precision"),
      hardware: setOf("hw"),
      engine: setOf("engine"),
      provider: searchParams.get("provider") || "",
      sort: searchParams.get("sort") || "released",
      q: (searchParams.get("q") || "").trim().toLowerCase(),
    };
  }, [searchParams]);

  const qMatchIds = useMemo(() => {
    if (!q) return null;
    return new Set(searchRecipes(recipes, q).map((r) => r.hf_id));
  }, [q, recipes]);

  const matchesQ = useCallback(
    (r) => !qMatchIds || qMatchIds.has(r.hf_id),
    [qMatchIds],
  );

  const update = useCallback(
    (patch) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const key of ["task", "arch", "size", "precision", "hw", "engine"]) {
        const first = sp.get(key)?.split(",").find(Boolean);
        if (first) sp.set(key, first);
        else sp.delete(key);
      }
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || v == null) {
          sp.delete(k);
        } else {
          sp.set(k, v);
        }
      }
      const qs = sp.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    },
    [router, searchParams]
  );
  const [queryInput, setQueryInput] = useState(searchParams.get("q") || "");
  const queryTimer = useRef(null);
  const updateRef = useRef(update);
  updateRef.current = update;
  useEffect(() => {
    setQueryInput(searchParams.get("q") || "");
  }, [searchParams]);
  useEffect(() => () => clearTimeout(queryTimer.current), []);
  const changeQuery = (value) => {
    setQueryInput(value);
    clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => updateRef.current({ q: value.trim() }), 250);
  };

  const toggle = useCallback(
    (key, value) => {
      const selected = (searchParams.get(key) || "").split(",").find(Boolean);
      update({ [key]: selected === value ? "" : value });
    },
    [searchParams, update]
  );

  const removeOne = useCallback(
    (key) => {
      update({ [key]: "" });
    },
    [update]
  );

  const providers = useMemo(() => {
    const orgs = [...new Set(recipes.map((r) => r.hf_org))];
    return orgs
      .map((o) => ({ id: o, label: getProviderDisplayName(o) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [recipes]);

  const selectedPrecision = [...precisions][0] || null;
  const selectedHardware = [...hardware][0] || null;

  // Counts shown next to each chip — based on the *other* active filters,
  // so changing the choice in one row doesn't suddenly zero it out.
  const counts = useMemo(() => {
    const matchExcept = (r, exclude) => {
      if (!matchesQ(r)) return false;
      if (exclude !== "engine" && engine.size > 0 && !(r.engines || []).some((id) => engine.has(id))) return false;
      if (exclude !== "task" && tasks.size > 0 && !(r.meta.tasks || []).some((t) => tasks.has(t))) return false;
      if (exclude !== "arch" && archs.size > 0 && !archs.has(r.model.architecture)) return false;
      if (exclude !== "size" && sizes.size > 0) {
        const b = paramsToB(r.model.parameter_count);
        const bucket = SIZE_BUCKETS.find((x) => x.test(b))?.id;
        if (!bucket || !sizes.has(bucket)) return false;
      }
      if (!matchingVariant(
        r,
        exclude === "precision" ? null : selectedPrecision,
        exclude === "hw" ? null : selectedHardware,
      )) return false;
      if (exclude !== "provider" && provider && r.hf_org !== provider) return false;
      return true;
    };
    const tally = (key, getter) => {
      const out = {};
      for (const r of recipes) {
        if (!matchExcept(r, key)) continue;
        const vals = getter(r);
        for (const v of vals) out[v] = (out[v] || 0) + 1;
      }
      return out;
    };
    return {
      engine: tally("engine", (r) => r.engines || ["vllm"]),
      task: tally("task", (r) => r.meta.tasks || []),
      arch: tally("arch", (r) => [r.model.architecture]),
      size: tally("size", (r) => {
        const b = paramsToB(r.model.parameter_count);
        const id = SIZE_BUCKETS.find((x) => x.test(b))?.id;
        return id ? [id] : [];
      }),
      precision: tally("precision", (r) => [...new Set(r.variants
        .filter((variant) => !selectedHardware || variant.hardware.includes(selectedHardware))
        .map((variant) => variant.precision))]),
      hw: tally("hw", (r) => [...new Set(r.variants
        .filter((variant) => !selectedPrecision || variant.precision === selectedPrecision)
        .flatMap((variant) => variant.hardware))]),
    };
  }, [recipes, tasks, archs, sizes, selectedPrecision, selectedHardware, engine, provider, matchesQ]);

  const filtered = useMemo(() => {
    const out = recipes.filter((r) => {
      if (!matchesQ(r)) return false;
      if (engine.size > 0 && !(r.engines || []).some((id) => engine.has(id))) return false;
      if (tasks.size > 0 && !(r.meta.tasks || []).some((t) => tasks.has(t))) return false;
      if (archs.size > 0 && !archs.has(r.model.architecture)) return false;
      if (sizes.size > 0) {
        const b = paramsToB(r.model.parameter_count);
        const id = SIZE_BUCKETS.find((x) => x.test(b))?.id;
        if (!id || !sizes.has(id)) return false;
      }
      if (!matchingVariant(r, selectedPrecision, selectedHardware)) return false;
      if (provider && r.hf_org !== provider) return false;
      return true;
    });

    const cmp = {
      released: (a, b) => (new Date(b.hf_released || 0) - new Date(a.hf_released || 0)),
      updated: (a, b) => (new Date(b.meta.date_updated || 0) - new Date(a.meta.date_updated || 0)),
      size_desc: (a, b) => paramsToB(b.model.parameter_count) - paramsToB(a.model.parameter_count),
      size_asc: (a, b) => paramsToB(a.model.parameter_count) - paramsToB(b.model.parameter_count),
      name: (a, b) => a.hf_id.localeCompare(b.hf_id),
    }[sort] || ((a, b) => 0);
    return [...out].sort(cmp);
  }, [recipes, tasks, archs, sizes, selectedPrecision, selectedHardware, engine, provider, sort, matchesQ]);

  const activeCount =
    tasks.size + archs.size + sizes.size + precisions.size + hardware.size + engine.size +
    (provider ? 1 : 0) + (q ? 1 : 0);
  const hasFilters = activeCount > 0;

  // Flat list of currently-applied filters for the inline pills shown when
  // the panel is collapsed. Keeps user oriented without forcing a panel
  // expand to see what's selected.
  const activeFilters = useMemo(() => {
    const out = [];
    if (q) out.push({ key: "q", value: q, label: `"${q}"` });
    for (const t of tasks) out.push({ key: "task", value: t, label: t });
    for (const id of engine) out.push({ key: "engine", value: id, label: id === "sglang" ? "SGLang" : "vLLM" });
    for (const a of archs) out.push({ key: "arch", value: a, label: ARCH_META[a]?.label || a });
    for (const id of sizes) {
      const b = SIZE_BUCKETS.find((x) => x.id === id);
      if (b) out.push({ key: "size", value: id, label: b.label });
    }
    for (const p of precisions) out.push({ key: "precision", value: p, label: p.toUpperCase() });
    for (const h of hardware) {
      const opt = hardwareById[h];
      if (opt) out.push({ key: "hw", value: h, label: opt.label });
    }
    if (provider) out.push({ key: "provider", value: provider, label: getProviderDisplayName(provider) });
    return out;
  }, [q, tasks, archs, sizes, precisions, hardware, engine, provider, hardwareById]);

  // Panel state persists in the URL (`?panel=open`) so a refresh keeps
  // whatever the user had. Default is closed — applied filters are
  // surfaced via the inline ActivePill row in the status bar, so a shared
  // filtered link doesn't need to expand the heavy panel to be readable.
  const open = searchParams.get("panel") === "open";
  const setOpen = (next) =>
    update({ panel: (typeof next === "function" ? next(open) : next) ? "open" : "" });

  const clearAll = () => {
    const sp = new URLSearchParams();
    if (sort !== "released") sp.set("sort", sort);
    if (open) sp.set("panel", "open");
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  return (
    <div className="catalog-layout">
      <aside className="catalog-filter">
        <div className="flex items-center justify-between border-b border-border py-4">
          <span className="section-label">FILTER THE INDEX</span>
          {hasFilters && <button onClick={clearAll} className="text-xs text-vllm-blue hover:underline">Clear all</button>}
        </div>
        <label className="catalog-search">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={queryInput}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                clearTimeout(queryTimer.current);
                update({ q: queryInput.trim() });
              }
              if (event.key === "Escape") changeQuery("");
            }}
            placeholder="Filter by model or provider"
            aria-label="Filter catalog by model or provider"
          />
        </label>
        <button className="lg:hidden flex w-full items-center justify-between border-b border-border py-3 text-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Filters <ChevronDown size={14} className={open ? "rotate-180" : ""} /></button>
        <div className={open ? "block" : "hidden lg:block"}>
        <FilterRow label="Engine">
          <PillGroup>
            {[
              { id: "vllm", label: "vLLM" },
              { id: "sglang", label: "SGLang" },
            ].map(({ id, label }) => (
              <Chip
                key={id}
                active={engine.has(id)}
                count={counts.engine[id]}
                onClick={() => toggle("engine", id)}
              >
                {label}
              </Chip>
            ))}
          </PillGroup>
        </FilterRow>
        <FilterRow label="Task">
          <PillGroup>
            {TASK_OPTIONS.map((t) => {
              const m = TASK_META[t] || {};
              return (
                <Chip
                  key={t}
                  icon={m.icon}
                  iconClass={m.iconClass}
                  active={tasks.has(t)}
                  count={counts.task[t]}
                  onClick={() => toggle("task", t)}
                >
                  {t}
                </Chip>
              );
            })}
          </PillGroup>
        </FilterRow>

        <FilterRow label="Arch">
          <PillGroup>
            {ARCH_OPTIONS.map((a) => {
              const m = ARCH_META[a];
              return (
                <Chip
                  key={a}
                  icon={m.icon}
                  iconClass={m.iconClass}
                  active={archs.has(a)}
                  count={counts.arch[a]}
                  onClick={() => toggle("arch", a)}
                >
                  {m.label}
                </Chip>
              );
            })}
          </PillGroup>
        </FilterRow>

        <FilterRow label="Size">
          <PillGroup>
            {SIZE_BUCKETS.map((b) => (
              <Chip
                key={b.id}
                dot={b.dot}
                active={sizes.has(b.id)}
                count={counts.size[b.id]}
                onClick={() => toggle("size", b.id)}
                mono
              >
                {b.label}
              </Chip>
            ))}
          </PillGroup>
        </FilterRow>

        <FilterRow label="Precision">
          <PillGroup>
            {PRECISION_OPTIONS.map((p) => (
              <Chip
                key={p}
                dot={PRECISION_DOT[p]}
                active={precisions.has(p)}
                count={counts.precision[p]}
                onClick={() => toggle("precision", p)}
                mono
              >
                {p}
              </Chip>
            ))}
          </PillGroup>
        </FilterRow>

        <FilterRow label="Hardware">
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground">Shows recipes with a compatible variant. Verified hardware is marked in the results.</p>
            {hardwareBrands.map((brand) => (
              <div key={brand.name} className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 w-28 shrink-0">
                  <span className="provider-monogram h-5 w-5 shrink-0 text-[10px]" aria-hidden="true">{brand.name.charAt(0)}</span>
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-foreground/80">
                    {brand.name}
                  </span>
                </span>
                <PillGroup>
                  {brand.items.map((opt) => (
                    <Chip
                      key={opt.id}
                      active={hardware.has(opt.id)}
                      count={counts.hw[opt.id]}
                      onClick={() => toggle("hw", opt.id)}
                      mono
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </PillGroup>
              </div>
            ))}
          </div>
        </FilterRow>

        <FilterRow label="Provider">
          <select
            value={provider}
            onChange={(e) => update({ provider: e.target.value })}
            className="rounded-lg border border-foreground/20 bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-vllm-blue/40 hover:border-foreground/40 transition-colors"
          >
            <option value="">All providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </FilterRow>
        </div>
      </aside>
      <div className="catalog-results">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div><strong className="text-3xl font-medium tabular-nums">{filtered.length}</strong><span className="ml-2 text-sm text-muted-foreground">of {recipes.length} recipes</span></div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">SORT BY <select value={sort} onChange={(e) => update({ sort: e.target.value === "released" ? "" : e.target.value })} className="border-b border-border bg-transparent px-2 py-1 text-sm text-foreground">{SORT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div>
        {hasFilters && <div className="mb-5 flex flex-wrap gap-2">{activeFilters.map((item) => <ActivePill key={item.key + item.value} onRemove={() => removeOne(item.key)}>{item.label}</ActivePill>)}</div>}
      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No recipes match these filters. <button onClick={clearAll} className="text-vllm-blue hover:underline">Clear all</button>
        </div>
      ) : (
        <div className="border-t-2 border-foreground overflow-hidden">
          {/* Header — desktop only */}
          <div className="hidden md:grid grid-cols-[1fr_72px_64px_72px_140px_1fr] gap-3 px-4 py-2 border-b border-border bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            <div>Model</div>
            <div>Size</div>
            <div>Arch</div>
            <div>Precision</div>
            <div>{selectedHardware ? "Hardware status" : "Verified on"}</div>
            <div>Notes</div>
          </div>
          <ul className="divide-y divide-border">
            {filtered.map((r) => <Row key={r.hf_id} recipe={r} hardware={selectedHardware} precision={selectedPrecision} engine={[...engine][0] || null} hardwareById={hardwareById} />)}
          </ul>
        </div>
      )}
      </div>
    </div>
  );
}

function FilterRow({ label, children }) {
  // Mirrors ConfigRow in CommandBuilder so the browse page feels like an
  // extension of the recipe page. Label slightly larger here (text-[11px]
  // vs text-[10px]) because this is a dedicated filter surface, not a
  // sidebar packed next to a command card.
  return (
    <div className="filter-row">
      <div className="section-label text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PillGroup({ children }) {
  return <div className="filter-options">{children}</div>;
}

function ActivePill({ children, onRemove }) {
  // Compact pill shown in the status bar when the filter panel is collapsed.
  // Whole pill is the remove affordance — clicking anywhere drops that filter.
  return (
    <button
      type="button"
      onClick={onRemove}
      className="group inline-flex items-center gap-1 rounded-md border border-vllm-blue/40 bg-vllm-blue/10 px-2 py-0.5 text-[12px] text-foreground hover:border-vllm-blue/70 hover:bg-vllm-blue/15 transition-colors"
      aria-label={`Remove ${children} filter`}
    >
      <span className="font-medium">{children}</span>
      <X size={11} className="text-muted-foreground group-hover:text-foreground transition-colors" />
    </button>
  );
}

function Chip({ active, count, onClick, icon: Icon, iconClass, dot, logo, mono, children }) {
  // Borders use foreground/20 instead of --border because dark-mode --border
  // is 10% white, which disappears on the card background.
  // Lead element: icon (Lucide component, color via iconClass), colored
  // dot (Tailwind bg- class), or logo (image URL). Disabled chips desaturate
  // all three so they don't compete with active ones.
  const disabled = !active && !count;
  const style = disabled
    ? "border-dashed border-foreground/15 text-muted-foreground/40 cursor-not-allowed bg-muted/10"
    : active
      ? "border-vllm-blue bg-vllm-blue/10 text-foreground ring-1 ring-vllm-blue/30 shadow-sm"
      : "border-foreground/20 text-foreground/80 hover:text-foreground hover:border-foreground/40 hover:bg-muted/40";
  const leadIconColor = disabled
    ? "text-muted-foreground/30"
    : active
      ? "text-vllm-blue"
      : iconClass || "text-muted-foreground";
  // `dot` is a full Tailwind string (size + color); disabled state forces
  // a neutral gray and a default size to keep alignment consistent.
  const dotClass = disabled ? "w-2 h-2 bg-muted-foreground/30" : dot;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`filter-chip inline-flex items-center gap-1.5 transition-colors ${style}`}
    >
      {Icon && <Icon size={13} className={leadIconColor} aria-hidden />}
      {dot && <span className={`inline-block rounded-full shrink-0 ${dotClass}`} aria-hidden />}
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={14}
          height={14}
          aria-hidden
          className={`rounded-sm shrink-0 ${disabled ? "opacity-30" : ""}`}
        />
      )}
      <span className={mono ? "font-mono uppercase tracking-wide" : "font-medium capitalize"}>
        {children}
      </span>
      {count != null && (
        <span
          className={`tabular-nums text-[11px] ${
            active ? "text-foreground/60" : "text-muted-foreground/70"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Row({ recipe, hardware, precision, engine, hardwareById }) {
  const r = recipe;
  const variant = matchingVariant(r, precision, hardware);
  const displayedPrecision = variant?.precision || r.variant?.precision;
  const queryParams = new URLSearchParams();
  if (variant?.key && variant.key !== "default") queryParams.set("variant", variant.key);
  if (hardware) queryParams.set("hardware", hardware);
  if (engine && engine !== "vllm") queryParams.set("engine", engine);
  const query = queryParams.toString();
  const isMoe = r.model.architecture === "moe";
  const params = r.model.parameter_count || "—";
  const active = r.model.active_parameters;
  const sizeLabel = isMoe && active && active !== params ? `${params}/${active}` : params;
  const verified = Object.entries(r.meta.hardware || {})
    .filter(([, s]) => s === "verified")
    .map(([h]) => h);
  const tasks = r.meta.tasks || [];

  return (
    <li>
      <Link
        href={`/${r.hf_id}${query ? `?${query}` : ""}`}
        className="group block px-2 py-5 hover:bg-muted/60 transition-colors md:grid md:grid-cols-[1fr_72px_64px_72px_140px_1fr] md:gap-3 md:items-center"
      >
        {/* Model */}
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="provider-monogram h-6 w-6 shrink-0 text-[11px]" aria-hidden="true">{r.hf_org.charAt(0)}</span>
          <div className="min-w-0">
            <div className="font-medium text-sm group-hover:text-vllm-blue transition-colors truncate">
              {r.hf_repo}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground truncate">
              {r.hf_org}
              {tasks.length > 0 && <span className="ml-2">· {tasks.join(" · ")}</span>}
              {r.engines?.includes("sglang") && <span className="ml-2 font-semibold text-vllm-blue">· SGLang</span>}
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="hidden md:flex items-center gap-1 text-xs">
          {isMoe ? <Layers size={10} className="text-muted-foreground" /> : <Cpu size={10} className="text-muted-foreground" />}
          <span className="font-mono">{sizeLabel}</span>
        </div>

        {/* Arch */}
        <div className="hidden md:block text-xs text-muted-foreground">
          {isMoe ? "MoE" : "Dense"}
        </div>

        {/* Precision */}
        <div className="hidden md:block text-xs font-mono uppercase">
          {displayedPrecision || "—"}
        </div>

        {/* Verified on */}
        <div className="hidden md:flex flex-wrap gap-1">
          {hardware ? (
            <span className="text-[10px] text-muted-foreground">
              {hardwareById[hardware]?.label || hardware} · {verified.includes(hardware) ? "Verified" : "Compatible"}
            </span>
          ) : verified.length === 0 ? (
            <span className="text-[10px] text-muted-foreground/50">—</span>
          ) : (
            verified.map((h) => (
              <span key={h} className="inline-block rounded border border-border px-1 py-0 text-[10px] font-mono text-muted-foreground">
                {hardwareById[h]?.label || h}
              </span>
            ))
          )}
        </div>

        {/* Notes */}
        <div className="hidden md:block text-xs text-muted-foreground line-clamp-2 leading-snug">
          {r.meta.description || r.meta.performance_headline}
        </div>

        {/* Mobile: spec strip */}
        <div className="md:hidden mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">{sizeLabel}</span>
          <span>·</span>
          <span>{isMoe ? "MoE" : "Dense"}</span>
          {displayedPrecision && (<><span>·</span><span className="font-mono uppercase">{displayedPrecision}</span></>)}
          {hardware ? (
            <>
              <span>·</span>
              <span>{hardwareById[hardware]?.label || hardware} · {verified.includes(hardware) ? "Verified" : "Compatible"}</span>
            </>
          ) : verified.length > 0 && (
            <>
              <span>·</span>
              <span className="font-mono">{verified.map((h) => hardwareById[h]?.label || h).join(" ")}</span>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
