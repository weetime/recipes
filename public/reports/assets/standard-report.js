(() => {
  const root = document.querySelector('[data-standard-report]');
  if (!root) return;
  const slug = root.dataset.standardReport;
  const languageKey = 'recipes-report-language';
  let language = localStorage.getItem(languageKey) === 'en' ? 'en' : 'zh';
  let report;
  let charts = [];
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const L = value => typeof value === 'object' && value !== null ? (value[language] ?? value.en ?? value.zh ?? '') : (value ?? '');
  const T = (zh, en) => language === 'zh' ? zh : en;
  const slugId = id => { const clean = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '-'); return ['method', 'overview'].includes(clean) ? `block-${clean}` : clean; };
  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[language]; });
    document.querySelectorAll('[data-en-placeholder][data-zh-placeholder]').forEach(el => { el.placeholder = el.dataset[`${language}Placeholder`]; });
    document.querySelectorAll('[data-lang-toggle]').forEach(el => { el.textContent = language === 'zh' ? 'EN' : '中文'; });
    window.dispatchEvent(new Event('report-language-change'));
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-lang-toggle]')) return;
    language = language === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem(languageKey, language); } catch {}
    applyLanguage(); render();
  });
  const nav = document.querySelector('.side');
  const navButton = document.querySelector('.nav-toggle');
  navButton.addEventListener('click', () => { const open = nav.dataset.expanded !== 'true'; nav.dataset.expanded = String(open); navButton.setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', event => { if (event.target.closest('a')) { nav.dataset.expanded = 'false'; navButton.setAttribute('aria-expanded','false'); } });
  window.addEventListener('report-theme-change', () => { if (report) drawCharts(); });
  function safeNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const match = String(value ?? '').trim().match(/^(-?\d[\d,]*(?:\.\d+)?)\s*(?:tok\/s|tokens?\/s|ms|s|%|req\/s)?$/i);
    return match ? Number(match[1].replace(/,/g,'')) : null;
  }
  // Derive a chart only from a complete numeric column with distinct category labels.
  // Do not parse ranges, relative changes, or fill missing values with zero.
  function tableChart(block) {
    const table = block.table;
    if (!table?.rows || table.rows.length < 2) return null;
    const headers = table.headers?.en || [];
    const labels = table.rows.map(row => String(row[0] ?? ''));
    if (new Set(labels).size !== labels.length) return null;
    const candidates = headers.map((header, i) => ({ header, i })).filter(({header, i}) => i > 0 && /output.*(tok|throughput)|throughput.*output|ttft|tpot|goodput|req\/s|request.*rate/i.test(header));
    for (const {header, i} of candidates) {
      const values = table.rows.map(row => safeNumber(row[i]));
      if (values.every(value => value !== null)) return { type: 'bar', title: { zh: table.headers.zh[i], en: header }, labels: { zh: labels, en: labels }, series: [{ zh: table.headers.zh[i], en: header, values, color: 'blue' }], yTitle: { zh: table.headers.zh[i], en: header } };
    }
    return null;
  }
  function tableFromChart(chart) {
    if (!chart?.labels || !chart?.series?.length) return null;
    const labels = L(chart.labels);
    if (!Array.isArray(labels) || !chart.series.every(s => Array.isArray(s.values) && s.values.length === labels.length)) return null;
    return { headers: { zh: ['测点', ...chart.series.map(s => s.zh || s.en || '')], en: ['Point', ...chart.series.map(s => s.en || s.zh || '')] }, rows: labels.map((label,i) => [label,...chart.series.map(s => s.values[i] == null ? '—' : String(s.values[i]))]) };
  }
  function titleFor(block) { return L(block.heading) || L(block.label) || block.id; }
  function render() {
    if (!report) return;
    charts.forEach(chart => chart.destroy()); charts = [];
    document.title = `${report.title} · ${T('性能报告','Performance report')} · Model Index`;
    const blocks = report.blocks || [];
    const meta = (report.meta || []).map(item => `<div class="spec"><small>${html(L(item))}</small><b>${html(L(item.value))}</b></div>`).join('');
    const stats = (report.stats || []).map(stat => `<article class="kpi"><div class="klabel">${html(language === 'zh' ? stat.zhLabel : stat.enLabel)}</div><strong>${html(stat.value)}</strong><small>${html(language === 'zh' ? stat.zhNote : stat.enNote)}</small></article>`).join('');
    const navLinks = [`<a href="#overview" data-index="00">${T('概览','Overview')}</a>`,...blocks.map((b,i) => `<a href="#${html(slugId(b.id))}" data-index="${String(i+1).padStart(2,'0')}">${html(L(b.label) || titleFor(b))}</a>`),`<a href="#method" data-index="${String(blocks.length+1).padStart(2,'0')}">${T('测试方法','Method')}</a>`].join('');
    const sections = blocks.map((block,index) => {
      const id = slugId(block.id);
      const chart = block.chart || tableChart(block);
      const table = block.table || tableFromChart(chart);
      const headers = table?.headers?.[language] || table?.headers?.en || [];
      const tableHtml = table ? `<div class="data-table"><table><thead><tr>${headers.map(header=>`<th scope="col">${html(header)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map((value,i)=>`<td data-label="${html(headers[i])}">${html(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
      const chartHtml = chart ? `<div class="panel"><div class="panel-head"><div><h3>${html(L(chart.title) || titleFor(block))}</h3>${L(chart.hint) ? `<p class="hint">${html(L(chart.hint))}</p>` : ''}</div></div><div class="plot"><canvas id="chart-${html(id)}" role="img" aria-label="${html(L(chart.title) || titleFor(block))}"></canvas></div></div>` : '';
      const notes = (block.notes || []).map(note=>`<p class="note">${html(L(note))}</p>`).join('');
      const side = block.side ? `<div class="intro-note"><strong>${html(L(block.side.title))}</strong><br>${html(L(block.side.body))}</div>` : '';
      return `<section class="section" id="${html(id)}"><div class="section-head"><div><div class="section-num">${String(index+1).padStart(2,'0')} / ${html(L(block.label) || id)}</div><h2>${html(titleFor(block))}</h2></div><p>${html(L(block.intro))}</p></div>${chartHtml}${tableHtml}${side}${notes}</section>`;
    }).join('');
    const method = (report.methodNotes || []).map(note=>`<p class="note">${html(L(note))}</p>`).join('');
    root.innerHTML = `<header class="hero"><div class="wrap"><div class="crumb"><a href="/">${T('模型目录','Model catalog')}</a>　/　<a href="/reports">${T('性能报告','Performance')}</a>　/　${html(report.breadcrumb || report.title)}</div><div class="titleline"><div><div class="eyebrow">${T('模型性能报告','MODEL PERFORMANCE REPORT')}</div><h1>${html(report.breadcrumb || report.title)}</h1><p class="desc">${html(L(report.lede))}</p></div></div><div class="badges">${(report.chips||[]).map(chip=>`<span class="badge">${html(chip)}</span>`).join('')}</div><div class="meta"><span>${html(L(report.snapshot))}</span></div></div></header><main class="wrap layout"><div class="content"><section class="section" id="overview"><div class="section-head"><div><div class="section-num">00 / EXECUTIVE SUMMARY</div><h2>${T('结果概览','Executive readout')}</h2></div><p>${html(L(report.overview?.intro))}</p></div>${stats ? `<div class="kpis">${stats}</div>` : ''}${L(report.overview?.note) ? `<div class="intro-note">${html(L(report.overview.note))}</div>` : ''}</section>${sections}<section class="section" id="method"><div class="section-head"><div><div class="section-num">${String(blocks.length+1).padStart(2,'0')} / TEST METHODOLOGY</div><h2>${T('测试配置与数据说明','Configuration and interpretation')}</h2></div><p>${html(L(report.methodIntro))}</p></div>${meta ? `<div class="specs">${meta}</div>` : ''}${method}</section><footer class="foot"><span>MODEL INDEX / PERFORMANCE REPORT</span><span><a href="/reports">${T('所有报告','All reports')}</a></span></footer></div></main>`;
    nav.querySelector('.side-links').innerHTML = `<strong>${T('章节导航','IN THIS REPORT')}</strong>${navLinks}`;
    drawCharts();
  }
  function drawCharts() {
    charts.forEach(chart => chart.destroy()); charts = [];
    const colors = { orange: '#8cb8fa', blue: '#7198cf', green: '#64c58a' };
    const style = getComputedStyle(document.documentElement);
    const grid = style.getPropertyValue('--line').trim(), text = style.getPropertyValue('--muted').trim();
    if (document.documentElement.dataset.theme === 'light') Object.assign(colors, { orange:'#477fc9', blue:'#6b8ebd', green:'#39845b' });
    for (const block of report.blocks || []) {
      const chart = block.chart || tableChart(block);
      const canvas = document.getElementById(`chart-${slugId(block.id)}`);
      if (!chart || !canvas || !Array.isArray(L(chart.labels)) || !Array.isArray(chart.series)) continue;
      const datasets = chart.series.map((s,i)=>({label:language === 'zh' ? (s.zh || s.en) : (s.en || s.zh),data:s.values,borderColor:colors[s.color]||Object.values(colors)[i%3],backgroundColor:colors[s.color]||Object.values(colors)[i%3],borderWidth:3,pointRadius:4,pointHoverRadius:7,tension:.12,spanGaps:false}));
      charts.push(new Chart(canvas,{type:chart.type||'line',data:{labels:L(chart.labels),datasets},options:{indexAxis:chart.indexAxis||'x',responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:datasets.length>1,labels:{color:text}},tooltip:{displayColors:datasets.length>1}},scales:{x:{ticks:{color:text},grid:{color:grid},title:{display:!!L(chart.xTitle),text:L(chart.xTitle),color:text}},y:{beginAtZero:true,ticks:{color:text},grid:{color:grid},title:{display:!!L(chart.yTitle),text:L(chart.yTitle),color:text}}}}}));
    }
  }
  applyLanguage();
  fetch(`/reports/data/${encodeURIComponent(slug)}.json`,{cache:'no-store'}).then(response => { if (!response.ok) throw new Error('HTTP '+response.status); return response.json(); }).then(data => { report=data; render(); }).catch(() => { root.innerHTML = `<p class="note">${T('报告数据加载失败，请刷新页面重试。','Report data could not be loaded. Please refresh.')}</p>`; });
})();
