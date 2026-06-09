/* Конфиг backend URL для прототипа.
 * Локально (npx serve / dev-proxy) отдаётся этот пустой файл — интеграция не активируется
 * (для локального e2e backend задаёт dev-proxy.py через инжект AKK_API_BASE).
 * В проде nginx ПЕРЕОПРЕДЕЛЯЕТ /config.js, подставляя AKK_BACKEND_URL из env Railway. */
window.AKK_BACKEND_URL = window.AKK_BACKEND_URL || '';
