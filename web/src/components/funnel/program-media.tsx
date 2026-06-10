// =====================================================
// ===== B1: медиа программы (фото + иконка-фолбэк) =====
// Иконки и карта PROGRAM_MEDIA — перенос из index.html (≈ 2513–2555).
// Фото img/programs/{id}.jpg; при ошибке загрузки показываем иконку категории.
// =====================================================

import type { ReactElement } from 'react';

type IconKey = 'wheat' | 'sprout' | 'cow' | 'poultry' | 'coins';

// SVG-пути иконок (как PROGRAM_ICONS в легаси).
const ICON_PATHS: Record<IconKey, ReactElement> = {
  wheat: (
    <>
      <path d="M12 21V9" />
      <path d="M12 9c0-2.2 1.6-3.8 3.8-3.8C15.8 7.4 14.2 9 12 9zM12 9c0-2.2-1.6-3.8-3.8-3.8C8.2 7.4 9.8 9 12 9z" />
      <path d="M12 14.5c0-2.2 1.6-3.8 3.8-3.8C15.8 12.9 14.2 14.5 12 14.5zM12 14.5c0-2.2-1.6-3.8-3.8-3.8C8.2 12.9 9.8 14.5 12 14.5z" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12C12 8 9 5.5 5 5.5 5 9.5 8 12 12 12z" />
      <path d="M12 14c0-3 2.4-5.2 6-5.2 0 3-2.4 5.2-6 5.2z" />
    </>
  ),
  cow: (
    <>
      <path d="M5 9c-1.2 0-2-1-2-2.2C3 5.5 3.8 5 4.6 5.4M19 9c1.2 0 2-1 2-2.2C21 5.5 20.2 5 19.4 5.4" />
      <path d="M5 7c0 5 3 8.5 7 8.5s7-3.5 7-8.5" />
      <path d="M9 18.5h6" />
      <circle cx="9.5" cy="9" r=".6" fill="currentColor" />
      <circle cx="14.5" cy="9" r=".6" fill="currentColor" />
    </>
  ),
  poultry: (
    <>
      <path d="M16 6h.01" />
      <path d="M20 5c-1.6 0-2.6.8-3.5 1.7l-4.5 4.5C10 13.2 8 13.5 6 13.5c0 2 2 3.8 4.6 3.8 3.6 0 6.4-2.8 6.4-6.4V7.5L20 5z" />
      <path d="M10.5 17.3 9 21M13 16.5 12.5 21" />
    </>
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 6.2A5.5 5.5 0 1 1 10 19.3" />
    </>
  ),
};

const PROGRAM_MEDIA: Record<string, IconKey> = {
  ken_dala: 'wheat',
  ken_dala_2: 'wheat',
  agrobusiness: 'sprout',
  agrobusiness_2: 'sprout',
  igilik_bereke: 'cow',
  feedlot_poultry: 'poultry',
  isker: 'coins',
};

/** Иконка-фолбэк программы (показывается под фото; видна, если фото нет). */
export function ProgramIcon({ id }: { id: string }) {
  const key = PROGRAM_MEDIA[id] || 'sprout';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[key]}
    </svg>
  );
}
