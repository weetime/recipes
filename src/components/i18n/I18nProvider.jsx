"use client";

import { useLocale, useTranslations } from "next-intl";

// Keep a small adapter while components migrate: all formatting and message
// resolution are delegated to next-intl (including ICU plural rules).
export { useLocale };
export function useT() {
  return useTranslations();
}
