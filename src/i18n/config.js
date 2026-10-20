export const locales = ["en", "zh"];
export const defaultLocale = "en";

export const routing = {
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: true,
  localeCookie: {
    name: "model-index-locale",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  },
};

export function isLocale(value) {
  return locales.includes(value);
}
