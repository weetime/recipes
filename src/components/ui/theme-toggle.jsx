"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) {
    return <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label={t("common.switchDark")}><div className="w-4 h-4" /></button>;
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
      aria-label={t(theme === "light" ? "common.switchDark" : "common.switchLight")}
    >
      {theme === "light" ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
    </button>
  );
}
