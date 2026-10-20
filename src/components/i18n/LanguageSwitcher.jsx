"use client";

import { usePathname } from "@/i18n/navigation";
import { Globe2 } from "lucide-react";

export function LanguageSwitcher({ locale, label }) {
  const pathname = usePathname() || "/";

  function switchLanguage() {
    const basePath = pathname || "/";
    const nextLocale = locale === "zh" ? "en" : "zh";
    try {
      localStorage.setItem("model-index-locale", nextLocale);
      localStorage.setItem("recipes-report-language", nextLocale);
      document.cookie = `model-index-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {}
    const destination = nextLocale === "zh" ? `/zh${basePath === "/" ? "" : basePath}` : basePath;
    window.location.assign(`${destination}${window.location.search}${window.location.hash}`);
  }

  return (
    <button type="button" onClick={switchLanguage} className="inline-flex h-8 items-center gap-1.5 border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-vllm-blue transition-colors" aria-label={label} title={label}>
      <Globe2 size={13} aria-hidden="true" />
      {locale === "zh" ? "中文" : "EN"}
    </button>
  );
}
