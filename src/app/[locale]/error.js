"use client";

import { useT } from "@/components/i18n/I18nProvider";

export default function Error({ error, reset }) {
  const t = useT();
  return (
    <main className="max-w-6xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-2">{t("notFound.error")}</h1>
      <p className="text-muted-foreground mb-4">{error?.message || t("notFound.unexpected")}</p>
      <button
        onClick={reset}
        className="text-sm text-vllm-blue hover:underline"
      >
        {t("notFound.tryAgain")}
      </button>
    </main>
  );
}
