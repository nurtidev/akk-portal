import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as "ru" | "kk" | "en")) {
    locale = routing.defaultLocale;
  }

  // Файлы-зоны по трекам разработки: common (фундамент), funnel (воронка),
  // content (контентные страницы), cabinet (auth + личный кабинет).
  // Верхнеуровневые ключи не должны пересекаться между файлами.
  const [common, funnel, content, cabinet] = await Promise.all([
    import(`../../messages/${locale}/common.json`),
    import(`../../messages/${locale}/funnel.json`),
    import(`../../messages/${locale}/content.json`),
    import(`../../messages/${locale}/cabinet.json`),
  ]);

  return {
    locale,
    messages: {
      ...common.default,
      ...funnel.default,
      ...content.default,
      ...cabinet.default,
    },
  };
});
