import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "./config";
import { messages } from "./messages";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: messages[locale],
  };
});
