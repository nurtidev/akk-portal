import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Матчим все пути, кроме статики и Next.js-внутренних
  matcher: [
    // Все пути с локалью-префиксом
    "/(ru|kk|en)/:path*",
    // Корневой путь (редирект на дефолтную локаль)
    "/",
  ],
};
