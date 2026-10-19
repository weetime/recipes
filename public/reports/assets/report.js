(() => {
  const langKey = "recipes-report-language";
  let lang = localStorage.getItem(langKey) || "zh";
  let currentReport = null;
  const applyLanguage = () => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-en][data-zh]").forEach((el) => { el.textContent = el.dataset[lang]; });
    document.querySelectorAll("[data-lang-toggle]").forEach((el) => { el.textContent = lang === "zh" ? "EN" : "中文"; });
    window.dispatchEvent(new Event("report-language-change"));
    if (currentReport) render(currentReport);
  };
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-lang-toggle]")) { lang = lang === "zh" ? "en" : "zh"; localStorage.setItem(langKey, lang); applyLanguage(); }
  });
  applyLanguage();

  const root = document.querySelector("[data-report]");
  if (!root) return;
  fetch(`/reports/data/${root.dataset.report}.json?v=20261018-1`, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error("Report data unavailable");
    return res.json();
  }).then((report) => render(report)).catch((error) => {
    console.error("Failed to render performance report", error);
    document.querySelector("main").innerHTML = `<p class="note">${error.message}</p>`;
  });

  function render(r) {
    currentReport = r;
    const L = (zh, en) => { const value = lang === "zh" ? zh : en; return value ?? (lang === "zh" ? en : zh) ?? ""; };
    const nav = r.sections.map((s, i) => `<a href="#${s.id}" data-index="${String(i).padStart(2,"0")}">${L(s?.zh,s?.en)}</a>`).join("");
    const chips = r.chips.map((v) => `<span class="chip">${v}</span>`).join("");
    const stats = r.stats.map((s) => `<div class="stat"><small>${L(s.zhLabel,s.enLabel)}</small><strong>${s.value}</strong><span>${L(s.zhNote,s.enNote)}</span></div>`).join("");
    const meta = r.meta.map((m) => `<div class="meta"><span class="meta-label">${L(m.zh,m.en)}</span><strong>${typeof m.value === "object" ? L(m.value?.zh,m.value?.en) : m.value}</strong></div>`).join("");
    document.title = `${r.title} · Performance report · Model Recipes`;
    document.querySelector("main").innerHTML = `
      <div class="wrap" data-report-content>
       <div class="eyebrow"><a href="/reports/">${L("性能报告","PERFORMANCE REPORTS")}</a>　/　${r.breadcrumb}</div>
       <header class="report-hero"><div class="kicker">${r.kicker}</div><h1>${r.title}</h1><p class="lede">${L(r.lede?.zh,r.lede?.en)}</p><div class="chips">${chips}</div></header>
       <div class="snapshot"><span>${L(r.snapshot?.zh,r.snapshot?.en)}</span><span>${L("独立测试 · 口径与边界见下文","Independent measurement · workload and limits below")}</span></div>
       <aside class="section-side" aria-label="Report sections" data-expanded="false"><button class="nav-toggle" type="button" aria-expanded="false"><span class="nav-toggle-icon" aria-hidden="true">☰</span><span class="nav-toggle-label">${L("章节","Sections")}</span><span class="nav-toggle-close" aria-hidden="true">×</span></button><div class="side-links"><strong>${L("章节导航","SECTIONS")}</strong>${nav}</div></aside>
       <div class="report-body">
        <section class="section" id="overview"><div class="section-heading"><div><div class="section-index">00 / ${L("结果概览","EXECUTIVE READOUT")}</div><h2>${L(r.overview?.heading?.zh,r.overview?.heading?.en)}</h2></div><p>${L(r.overview?.intro?.zh,r.overview?.intro?.en)}</p></div><div class="stats">${stats}</div><p class="callout">${L(r.overview?.note?.zh,r.overview?.note?.en)}</p></section>
        ${r.blocks.map((b,i)=>sectionHtml(b,i)).join("")}
        <section class="section" id="method"><div class="section-heading"><div><div class="section-index">${String(r.blocks.length+1).padStart(2,"0")} / ${L("测试方法","METHOD")}</div><h2>${L("测试配置与结果边界","Configuration and interpretation")}</h2></div><p>${L(r.methodIntro?.zh,r.methodIntro?.en)}</p></div><div class="meta-grid">${meta}</div>${r.methodNotes.map(n=>`<p class="note">${L(n?.zh,n?.en)}</p>`).join("")}</section>
       </div><footer class="foot"><span>MODEL INDEX　/　PERFORMANCE REPORT</span><span><a href="/reports/">${L("所有报告","All reports")}</a>　·　<a href="/">MODEL RECIPES ↗</a></span></footer>
      </div>`;
    setupCharts(r);
    setupNav();
  }
  function sectionHtml(b,i) {
    const L=(zh,en)=>{const value=lang==="zh"?zh:en;return value??(lang==="zh"?en:zh)??"";};
    const n=String(i+1).padStart(2,"0");
    const chart=b.chart?`<div class="panel"><h3>${L(b.chart.title?.zh,b.chart.title?.en)}</h3><p class="hint">${L(b.chart.hint?.zh,b.chart.hint?.en)}</p><div class="chart-wrap"><canvas id="chart-${b.id}"></canvas></div></div>`:"";
    const table=b.table?`<div class="table-wrap"><table><thead><tr>${b.table.headers[lang].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${b.table.rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:"";
    const side=b.side?`<div class="panel"><h3>${L(b.side.title?.zh,b.side.title?.en)}</h3><p>${L(b.side.body?.zh,b.side.body?.en)}</p></div>`:"";
    return `<section class="section" id="${b.id}"><div class="section-heading"><div><div class="section-index">${n} / ${L(b.label?.zh,b.label?.en)}</div><h2>${L(b.heading?.zh,b.heading?.en)}</h2></div><p>${L(b.intro?.zh,b.intro?.en)}</p></div>${chart&&side?`<div class="grid2">${chart}${side}</div>`:chart}${table}${b.notes.map(x=>`<p class="note">${L(x?.zh,x?.en)}</p>`).join("")}</section>`;
  }
  function setupCharts(r) {
    const charts=[];
    const build=()=>{
      const css=getComputedStyle(document.documentElement);
      const palette={orange:css.getPropertyValue("--orange").trim(),blue:css.getPropertyValue("--blue").trim(),green:css.getPropertyValue("--green").trim(),grid:css.getPropertyValue("--line").trim(),text:css.getPropertyValue("--muted").trim()};
      charts.forEach(c=>c.destroy());charts.length=0;
      r.blocks.filter(b=>b.chart).forEach(b=>{
        const ctx=document.getElementById(`chart-${b.id}`); if(!ctx)return;
        const datasets=b.chart.series.map((s,i)=>({label:lang==="zh"?s.zh:s.en,data:s.values,borderColor:palette[s.color]||palette.orange,backgroundColor:palette[s.color]||palette.orange,borderWidth:3,pointRadius:4,pointHoverRadius:7,tension:.16,spanGaps:false}));
        charts.push(new Chart(ctx,{type:b.chart.type||"line",data:{labels:lang==="zh"?b.chart.labels.zh:b.chart.labels.en,datasets},options:{indexAxis:b.chart.indexAxis||"x",responsive:true,maintainAspectRatio:false,interaction:{mode:"nearest",intersect:true},animation:{duration:260},plugins:{legend:{labels:{color:palette.text,usePointStyle:true,boxWidth:8}},tooltip:{backgroundColor:css.getPropertyValue("--panel").trim(),titleColor:css.getPropertyValue("--text").trim(),bodyColor:palette.text,borderColor:palette.grid,borderWidth:1,padding:11}},scales:{x:{ticks:{color:palette.text},grid:{color:palette.grid},title:{display:!!b.chart.xTitle,text:lang==="zh"?b.chart.xTitle?.zh:b.chart.xTitle?.en,color:palette.text}},y:{beginAtZero:true,ticks:{color:palette.text},grid:{color:palette.grid},title:{display:!!b.chart.yTitle,text:lang==="zh"?b.chart.yTitle?.zh:b.chart.yTitle?.en,color:palette.text}}}}}));
      });
    };
    build();window.addEventListener("report-language-change",build);window.addEventListener("report-theme-change",build);
  }
  function setupNav(){
    const links=[...document.querySelectorAll(".side-links a")];
    const observer=new IntersectionObserver((entries)=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle("active",a.hash===`#${e.target.id}`));}}),{rootMargin:"-25% 0px -65% 0px"});
    links.forEach(a=>{const s=document.querySelector(a.hash);if(s)observer.observe(s);});
    const side=document.querySelector(".section-side"), toggle=side?.querySelector(".nav-toggle");
    toggle?.addEventListener("click",()=>{const open=side.dataset.expanded!=="true";side.dataset.expanded=String(open);toggle.setAttribute("aria-expanded",String(open));});
    links.forEach(a=>a.addEventListener("click",()=>{side.dataset.expanded="false";toggle?.setAttribute("aria-expanded","false");}));
  }
})();
