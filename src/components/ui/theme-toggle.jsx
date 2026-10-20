"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";

export function ThemeToggle() {
  const t = useT();
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else {
      setTheme("dark");
      document.documentElement.classList.add("dark");
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
