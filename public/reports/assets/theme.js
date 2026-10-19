(() => {
  const key = "theme";
  const root = document.documentElement;

  function applyTheme(theme) {
    const normalized = theme === "light" ? "light" : "dark";
    root.dataset.theme = normalized;
    root.style.colorScheme = normalized;
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const next = normalized === "dark" ? "light" : "dark";
      button.textContent = normalized === "dark" ? "☼" : "◐";
      const zh = document.documentElement.lang.toLowerCase().startsWith("zh");
      button.setAttribute("aria-label", zh ? (next === "light" ? "切换到浅色主题" : "切换到深色主题") : (next === "light" ? "Switch to light theme" : "Switch to dark theme"));
      button.setAttribute("title", zh ? (next === "light" ? "浅色主题" : "深色主题") : (next === "light" ? "Light theme" : "Dark theme"));
    });
  }

  let theme = "dark";
  try { theme = localStorage.getItem(key) || "dark"; } catch {}
  applyTheme(theme);

  window.addEventListener("report-language-change", () => applyTheme(root.dataset.theme));

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(key, theme); } catch {}
    applyTheme(theme);
    window.dispatchEvent(new CustomEvent("report-theme-change", { detail: { theme } }));
  });
})();
