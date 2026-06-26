import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Каталог admin/ — самостоятельный проект внутри monorepo akk-portal (свой
  // package-lock.json). Прижимаем трейсинг standalone к нему, иначе Next берёт
  // корневой lockfile и тащит лишние файлы / собирает неверный standalone.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
