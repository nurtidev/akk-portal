"use client";

/**
 * ThemeScript — инлайн-скрипт, который синхронно применяет сохранённую тему
 * ДО гидратации React, устраняя FOUC (flash of unstyled content).
 * Ключ localStorage: `akk-theme` (совместимость с легаси index.html).
 */
export function ThemeScript({ storageKey = "akk-theme" }: { storageKey?: string }) {
  const script = `
(function() {
  try {
    var theme = localStorage.getItem('${storageKey}');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch(e) {}
})();
`.trim();

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
