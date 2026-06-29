// =====================================================
// ===== Брошюры программ (PDF + веб-превью) ============
// Файлы: web/public/brochures/{ru,kk}/<id>.{pdf,webp}
// Источник — официальные листовки АКК (brochures/PDF), переданные владельцем.
// Превью .webp сгенерированы из PDF (pdftoppm + cwebp, ширина 1400, q80).
// Покрыты только программы, для которых есть листовка; en → ru-фолбэк.
// =====================================================

export interface Brochure {
  /** Полный PDF на скачивание. */
  pdf: string;
  /** Лёгкое веб-превью первой страницы. */
  preview: string;
}

/** id программы → есть листовка. Остальные (isker, feedlot_poultry, ken_dala) пока без брошюры. */
const COVERED = new Set(['agrobusiness', 'agrobusiness_2', 'igilik_bereke', 'ken_dala_2']);

/** Брошюра программы для локали или null, если листовки нет. */
export function getBrochure(programId: string, locale: string): Brochure | null {
  if (!COVERED.has(programId)) return null;
  const lang = locale === 'kk' ? 'kk' : 'ru'; // en печатает русскую листовку
  return {
    pdf: `/brochures/${lang}/${programId}.pdf`,
    preview: `/brochures/${lang}/${programId}.webp`,
  };
}
