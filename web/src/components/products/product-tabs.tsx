'use client';

// =====================================================
// ProductTabs — табы детальной страницы продукта.
// Контент всех вкладок отрисован сервером и передаётся как RSC через проп
// `tabs` (Условия / Требования / Документы / Вопросы). Переключение — на клиенте,
// все панели остаются в DOM (hidden) ради SEO. Порядок вкладок — как просил ПП:
// продукт → условия → требования → документы → ФАК.
// =====================================================

import { useState } from 'react';

export interface ProductTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');

  return (
    <div>
      {/* Лента вкладок — липкая под шапкой (h-16 = top-16) */}
      <div
        role="tablist"
        aria-label="Разделы программы"
        className="sticky top-16 z-30 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 backdrop-blur-sm sm:gap-2"
      >
        {tabs.map((tb) => {
          const selected = active === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tb.id}`}
              id={`tab-${tb.id}`}
              onClick={() => setActive(tb.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:px-4 ${
                selected
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-3)] hover:text-[var(--text)]'
              }`}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tb) => (
        <div
          key={tb.id}
          role="tabpanel"
          id={`panel-${tb.id}`}
          aria-labelledby={`tab-${tb.id}`}
          hidden={active !== tb.id}
        >
          {tb.content}
        </div>
      ))}
    </div>
  );
}
