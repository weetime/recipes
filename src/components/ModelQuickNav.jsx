"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, Search, X } from "lucide-react";

export function ModelQuickNav({ recipes }) {
  const pathname = usePathname();
  const [org, repo] = pathname.split("/").filter(Boolean);
  const [scope, setScope] = useState("provider");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeRef = useRef(null);

  useEffect(() => {
    setScope("provider");
    setQuery("");
    setMobileOpen(false);
  }, [org]);

  const providerCount = useMemo(() => recipes.filter((recipe) => recipe.org === org).length, [recipes, org]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (scope === "provider" && recipe.org !== org) return false;
      if (!needle) return true;
      return (recipe.id + " " + recipe.title + " " + recipe.provider).toLowerCase().includes(needle);
    });
  }, [recipes, scope, org, query]);
  useEffect(() => {
    const link = activeRef.current;
    const scroller = link?.closest(".quick-nav-results");
    if (!scroller) return;
    const linkBox = link.getBoundingClientRect();
    const scrollBox = scroller.getBoundingClientRect();
    if (linkBox.top < scrollBox.top || linkBox.bottom > scrollBox.bottom) {
      scroller.scrollTop += linkBox.top - scrollBox.top - scroller.clientHeight / 2;
    }
  }, [pathname, filtered, mobileOpen]);

  return (
    <aside className="model-quick-nav" aria-label="Quick model navigation">
      <button type="button" className="quick-nav-mobile" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen}>
        Quick navigation <ChevronDown size={16} className={mobileOpen ? "rotate-180" : ""} />
      </button>
      <div className={mobileOpen ? "quick-nav-body is-open" : "quick-nav-body"}>
        <div className="quick-nav-top">
          <span>MODEL INDEX / NAVIGATE</span>
          <span>{String(recipes.length).padStart(3, "0")}</span>
        </div>
        <Link href="/browse" className="quick-nav-all">Browse full catalog <ArrowUpRight size={14} /></Link>
        {repo && (
          <div className="quick-nav-section">
            <span className="quick-nav-label">ON THIS PAGE</span>
            <a href="#configure" className="quick-nav-anchor">Configure serving</a>
            <a href="#recipe-guide" className="quick-nav-anchor">Technical notes</a>
          </div>
        )}
        <div className="quick-nav-section">
          <span className="quick-nav-label">JUMP TO A MODEL</span>
          <div className="quick-nav-scope" role="group" aria-label="Model scope">
            <button type="button" aria-pressed={scope === "provider"} onClick={() => setScope("provider")}>{org} <small>{providerCount}</small></button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>All</button>
          </div>
          <label className="quick-nav-search">
            <Search size={14} aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter models" aria-label="Filter models" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear model filter"><X size={13} /></button>}
          </label>
          <div className="quick-nav-count">{filtered.length} MODEL{filtered.length === 1 ? "" : "S"}</div>
          <nav className="quick-nav-results" aria-label="Models">
            {filtered.slice(0, 100).map((recipe) => {
              const active = org === recipe.org && repo === recipe.repo;
              return (
                <Link key={recipe.id} ref={active ? activeRef : null} href={"/" + recipe.id} aria-current={active ? "page" : undefined} className="quick-nav-model">
                  <span className="quick-nav-model-name">{recipe.repo}</span>
                  {scope === "all" && <span className="quick-nav-model-org">{recipe.org}</span>}
                </Link>
              );
            })}
            {filtered.length === 0 && <p className="quick-nav-empty">No matching models.</p>}
            {filtered.length > 100 && <p className="quick-nav-empty">Showing the first 100. Refine the search to narrow the list.</p>}
          </nav>
        </div>
      </div>
    </aside>
  );
}
