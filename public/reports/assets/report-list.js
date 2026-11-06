(() => {
  const key = 'recipes-report-language';
  let language = localStorage.getItem(key) === 'en' ? 'en' : 'zh';
  let catalog;
  const filters = Object.fromEntries(['model','hardware','engine','precision','test','sort'].map(id => [id, document.getElementById(id)]));
  const search = document.getElementById('search');
  const list = document.getElementById('report-list');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const t = (zh, en) => language === 'zh' ? zh : en;
  const tests = {fixed:['固定长度 / 容量','Fixed length / capacity'],agent:['Agent 回放','Agent replay'],openLoop:['开放环负载','Open-loop load'],longContext:['长上下文','Long context'],stability:['稳定性','Stability'],sharegpt:['ShareGPT','ShareGPT'],vision:['视觉','Vision'],quality:['任务质量','Task quality'],videoGeneration:['视频生成','Video generation']};
  function label(id) { return tests[id] ? t(...tests[id]) : id; }
  function applyLanguage() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(el => {el.textContent = el.dataset[language]});
    document.querySelectorAll('[data-en-placeholder][data-zh-placeholder]').forEach(el => {el.placeholder = el.dataset[`${language}Placeholder`]});
    document.querySelectorAll('[data-lang-toggle]').forEach(el => {el.textContent = language === 'zh' ? 'EN' : '中文'});
    window.dispatchEvent(new Event('report-language-change'));
    if (catalog) { fillFilters(); render(); }
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-lang-toggle]')) return;
    language = language === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem(key, language); } catch {}
    applyLanguage();
  });
  function setOptions(select, items) {
    const previous = select.value;
    select.innerHTML = items.map(([value,text])=>`<option value="${esc(value)}">${esc(text)}</option>`).join('');
    if (items.some(([value]) => value === previous)) select.value = previous;
  }
  function fillFilters() {
    const reports = catalog[language];
    const uniq = field => [...new Set(reports.map(r => r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b)).map(x=>[x,x]);
    setOptions(filters.model,[['all',t('所有模型','All models')],...uniq('modelName')]);
    setOptions(filters.hardware,[['all',t('所有硬件','All GPU models')],...uniq('hardwareName')]);
    setOptions(filters.engine,[['all',t('所有引擎','All engines')],...uniq('engine')]);
    setOptions(filters.precision,[['all',t('所有精度','All precisions')],...uniq('precision')]);
    setOptions(filters.test,[['all',t('所有场景','All test types')],...Object.keys(tests).map(id=>[id,label(id)])]);
    setOptions(filters.sort,[['newest',t('最新优先','Newest first')],['model',t('按模型','Model')],['hardware',t('按硬件','Hardware')],['32k-512-c1','32K / 512 · C1'],['8k-256-c16','8K / 256 · C16'],['8k-2048-c16','8K / 2048 · C16']]);
  }
  function curveHtml(curve) {
    if (!curve || !Array.isArray(curve.values) || curve.values.filter(Number.isFinite).length < 2) return `<div class="curve-empty">${t('暂无可展示的趋势','No trend data')}</div>`;
    const valid=curve.values.filter(Number.isFinite),min=Math.min(0,...valid),max=Math.max(...valid),span=max-min||1;
    const points=curve.values.map((value,index)=>Number.isFinite(value)?{x:7+index*206/Math.max(curve.values.length-1,1),y:51-(value-min)/span*44,value,label:curve.labels[index]||String(index+1)}:null);
    const segments=[];let current=[];for(const point of points){if(point)current.push(`${point.x},${point.y}`);else if(current.length){segments.push(current.join(' '));current=[]}}if(current.length)segments.push(current.join(' '));
    const shown=curve.labels.length<=5?curve.labels:[curve.labels[0],curve.labels[Math.floor((curve.labels.length-1)/2)],curve.labels.at(-1)];
    return `<div class="curve-head"><span class="curve-title" title="${esc(curve.title)}">${esc(curve.title)}</span><span class="curve-unit">${esc(curve.unit)}</span></div><svg viewBox="0 0 220 58" class="mini-curve" role="img" aria-label="${esc(curve.title)}"><line class="axis" x1="7" y1="51" x2="213" y2="51" stroke-width="1"/>${segments.map(s=>`<polyline points="${s}"/>`).join('')}${points.map(p=>p?`<circle cx="${p.x}" cy="${p.y}" r="3" tabindex="0"><title>${esc(p.label)}: ${esc(p.value)} ${esc(curve.unit)}</title></circle>`:'').join('')}</svg><div class="curve-labels" aria-hidden="true">${shown.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`;
  }
  function rowHtml(report,index) {
    const metric=report.listMetric||report.singleStream;
    const tags=(report.testIds||[]).map((id,i)=>`<span class="tag">${esc(tests[id]?label(id):report.testLabels[i]||id)}</span>`).join('');
    return `<article class="report-row"><div class="row-main"><div class="row-meta"><span class="number">${String(index+1).padStart(2,'0')}</span>${esc(report.date)}　/　${esc(report.engine)}</div><h2 class="row-title"><a href="${esc(report.href)}">${esc(report.modelName)} <span class="times">×</span> ${esc(report.hardwareName)} <span style="color:var(--accent);font-size:15px">↗</span></a></h2><p class="row-desc">${esc(report.summary)}</p><div class="chips"><span class="chip">${esc(report.hardware)}</span><span class="chip">${esc(report.precision)}</span></div><div class="topology"><span>${t('拓扑','TOPOLOGY')}</span>　${esc(report.topology||t('详见报告','See report'))}</div></div><div class="row-coverage"><div class="block-title">${t('测试覆盖','TEST COVERAGE')}</div><div class="tags">${tags}</div><a class="read" href="${esc(report.href)}">${t('查看报告','Read report')} ↗</a></div><div class="row-metrics"><div><div class="metric-label">${esc(metric?.label||t('C1 单流输出','C1 SINGLE-STREAM OUTPUT'))}</div>${metric?`<div class="metric-profile">${esc(metric.profile)}</div><div class="metric-value">${esc(Number.isFinite(Number(metric.value)) ? Number(metric.value).toLocaleString(undefined,{maximumFractionDigits:2}) : metric.value)}<small>${esc(metric.unit)}</small></div>`:`<div class="metric-empty">${t('暂无 C1 测点','No C1 measurement')}</div>`}</div><div>${curveHtml(report.curve)}</div></div></article>`;
  }
  function render() {
    const reports = catalog[language];
    const q = search.value.trim().toLowerCase();
    const filtered = reports.filter(r => (!q || [r.modelName,r.modelId,r.hardware,r.topology,r.engine,r.precision,r.summary,...(r.testLabels||[])].join(' ').toLowerCase().includes(q)) && (filters.model.value==='all'||r.modelName===filters.model.value) && (filters.hardware.value==='all'||r.hardwareName===filters.hardware.value) && (filters.engine.value==='all'||r.engine===filters.engine.value) && (filters.precision.value==='all'||r.precision===filters.precision.value) && (filters.test.value==='all'||r.testIds.includes(filters.test.value)));
    const sort=filters.sort.value;
    filtered.sort((a,b)=>sort==='newest'?b.date.localeCompare(a.date)||a.modelName.localeCompare(b.modelName):sort==='model'?a.modelName.localeCompare(b.modelName)||b.date.localeCompare(a.date):sort==='hardware'?a.hardwareName.localeCompare(b.hardwareName)||b.date.localeCompare(a.date):(b.benchmarks[sort]??-Infinity)-(a.benchmarks[sort]??-Infinity));
    document.getElementById('total-count').textContent = `${reports.length} ${t('份报告','REPORTS')}`;
    document.getElementById('result-count').textContent = t(`${filtered.length} / ${reports.length} 份报告`,`${filtered.length} OF ${reports.length} REPORTS`);
    list.innerHTML=filtered.length?filtered.map(rowHtml).join(''):`<p class="loading">${t('没有匹配的报告。','No matching reports.')}</p>`;
  }
  for(const el of [...Object.values(filters),search]) el.addEventListener(el===search?'input':'change',render);
  applyLanguage();
  fetch('/reports/report-catalog.json', {cache:'no-store'}).then(response=>{if(!response.ok)throw Error('catalog');return response.json()}).then(data=>{catalog=data;fillFilters();render()}).catch(()=>{list.innerHTML=`<p class="loading">${t('报告列表加载失败，请刷新。','Unable to load reports. Please refresh.')}</p>`});
})();
