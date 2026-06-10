import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Поддерживаемые локали
  locales: ["ru", "kk", "en"],

  // Дефолтная локаль
  defaultLocale: "ru",
});
