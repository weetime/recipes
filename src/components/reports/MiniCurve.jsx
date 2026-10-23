export function MiniCurve({ curve }) {
  if (!curve) return null;
  const width = 220;
  const height = 58;
  const padX = 7;
  const padY = 7;
  const valid = curve.values.filter((value) => Number.isFinite(value));
  const min = Math.min(0, ...valid);
  const max = Math.max(...valid);
  const span = max - min || 1;
  const points = curve.values.map((value, index) => {
    if (!Number.isFinite(value)) return null;
    const x = padX + (index * (width - padX * 2)) / Math.max(curve.values.length - 1, 1);
    const y = height - padY - ((value - min) / span) * (height - padY * 2);
    return { x, y, value, label: curve.labels[index] || String(index + 1) };
  });
  const segments = [];
  let current = [];
  for (const point of points) {
    if (point) current.push(`${point.x},${point.y}`);
    else if (current.length) { segments.push(current.join(" ")); current = []; }
  }
  if (current.length) segments.push(current.join(" "));

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="truncate" title={curve.title}>{curve.title}</span>
        <span className="shrink-0 font-mono">{curve.unit}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[58px] w-full overflow-visible" role="img" aria-label={curve.title}>
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} className="stroke-border" strokeWidth="1" />
        {segments.map((segment, index) => <polyline key={index} points={segment} fill="none" className="stroke-vllm-blue" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {points.map((point, index) => point && (
          <circle key={index} cx={point.x} cy={point.y} r="3" className="fill-background stroke-vllm-blue" strokeWidth="2" tabIndex={0}>
            <title>{`${point.label}: ${point.value.toLocaleString()} ${curve.unit}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between gap-1 font-mono text-[9px] text-muted-foreground/75" aria-hidden="true">
        {curve.labels.length <= 5 ? curve.labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>) : <><span>{curve.labels[0]}</span><span>{curve.labels[Math.floor((curve.labels.length - 1) / 2)]}</span><span>{curve.labels.at(-1)}</span></>}
      </div>
    </div>
  );
}
