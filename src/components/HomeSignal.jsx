"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const ticks = Array.from({ length: 60 }, (_, index) => {
  const angle = (index / 60) * Math.PI * 2 - Math.PI / 2;
  const outer = 248;
  const inner = index % 5 === 0 ? 235 : 242;
  return {
    x1: 260 + Math.cos(angle) * inner,
    y1: 260 + Math.sin(angle) * inner,
    x2: 260 + Math.cos(angle) * outer,
    y2: 260 + Math.sin(angle) * outer,
    major: index % 5 === 0,
  };
});

export function HomeSignal({ options }) {
  const [selected, setSelected] = useState(0);
  const [run, setRun] = useState(0);
  const current = options[selected];

  return (
    <div className="signal-stage" aria-label="Explore deployment recipes by hardware">
      <div className="signal-stage-top">
        <span className="inline-flex items-center gap-2"><span className="signal-live" aria-hidden="true" /> LIVE INDEX</span>
        <span>MODEL → HARDWARE → COMMAND</span>
      </div>

      <div className="signal-orbit" key={run}>
        <svg viewBox="0 0 520 520" className="signal-orbit-svg" aria-hidden="true">
          <defs>
            <linearGradient id="signalArc" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--atlas-link)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--atlas-link)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--atlas-link)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="260" y1="0" x2="260" y2="520" className="signal-axis" />
          <line x1="0" y1="260" x2="520" y2="260" className="signal-axis" />
          <circle cx="260" cy="260" r="248" className="signal-ring-outer" />
          <circle cx="260" cy="260" r="213" className="signal-ring" />
          <circle cx="260" cy="260" r="166" className="signal-ring" />
          <circle cx="260" cy="260" r="116" className="signal-ring-inner" />
          {ticks.map((tick, index) => (
            <line key={index} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} className={tick.major ? "signal-tick-major" : "signal-tick"} />
          ))}
          <circle cx="260" cy="260" r="213" className="signal-arc" pathLength="100" />
          <circle cx="260" cy="260" r="166" className="signal-arc-secondary" pathLength="100" />
          <circle cx="260" cy="47" r="3" className="signal-point" />
          <circle cx="426" cy="260" r="3" className="signal-point" />
          <circle cx="260" cy="473" r="3" className="signal-point" />
          <circle cx="94" cy="260" r="3" className="signal-point" />
        </svg>
        <div className="signal-orbit-label signal-label-top">01 / MODEL</div>
        <div className="signal-orbit-label signal-label-right">02 / HARDWARE</div>
        <div className="signal-orbit-label signal-label-bottom">03 / ENGINE</div>
        <div className="signal-orbit-label signal-label-left">04 / COMMAND</div>
        <div className="signal-orbit-core">
          <span className="signal-core-overline">TARGET HARDWARE</span>
          <strong>{current.short}</strong>
          <span className="signal-core-divider" />
          <span className="signal-core-count">{current.count} <small>compatible recipes</small></span>
        </div>
      </div>

      <div className="signal-stage-bottom">
        <div className="signal-stage-selector" role="group" aria-label="Select target hardware">
          {options.map((option, index) => (
            <button
              type="button"
              key={option.id}
              onClick={() => { setSelected(index); setRun((value) => value + 1); }}
              aria-pressed={selected === index}
              className="signal-stage-option"
            >
              <span className="signal-option-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{option.short}</span>
            </button>
          ))}
        </div>
        <div className="signal-stage-route">
          <div className="min-w-0">
            <span className="signal-stage-caption">EXAMPLE RECIPE / {current.engine}</span>
            <Link href={current.sampleHref} className="signal-stage-sample">{current.sample}</Link>
          </div>
          <Link href={`/browse?hw=${current.id}&panel=open`} className="signal-stage-link">
            Browse {current.count} <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
