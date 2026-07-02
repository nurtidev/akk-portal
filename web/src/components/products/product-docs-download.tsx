'use client';

// =====================================================
// ProductDocsDownload — кнопка «Скачать чеклист в PDF» во вкладке «Документы»
// на детальной странице программы. Страница серверная, а генерация PDF
// клиентская (jsPDF), поэтому кнопка вынесена в отдельный клиентский компонент.
// Переиспользует ту же связку, что и в результатах квиза: getChecklist(id) +
// generateChecklistPdf() (dynamic import — jsPDF не тянется в основной бандл).
// Пробрасываем только примитивы (не весь Program) — чтобы не ловить проблем
// сериализации server→client.
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function ProductDocsDownload({
  programId,
  programTitle,
  programCategory,
  rate,
  rateRange,
  maxAmount,
  maxTerm,
  locale,
}: {
  programId: string;
  programTitle: string;
  programCategory: string;
  rate: number;
  rateRange?: string;
  maxAmount: number;
  maxTerm: number;
  locale: string;
}) {
  const tp = useTranslations('content.products');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const [{ generateChecklistPdf }, { getChecklist }] = await Promise.all([
        import('@/lib/pdf-checklist'),
        import('@/data/loan-documents'),
      ]);
      await generateChecklistPdf({
        programId,
        programTitle,
        programCategory,
        rate,
        rateRange,
        maxAmount,
        maxTerm,
        checklist: getChecklist(programId),
        locale: locale === 'kk' ? 'kk' : locale === 'en' ? 'en' : 'ru',
      });
    } catch (err) {
      console.error('[PDF checklist]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
      )}
      {loading ? tp('docsPdfLoading') : tp('docsPdfBtn')}
    </button>
  );
}
