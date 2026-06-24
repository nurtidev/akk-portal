'use client';

// =====================================================
// ===== ClientTrust — секция социального доказательства
// Отдельный блок под hero: микро-лейбл «Наши клиенты» →
// стена логотипов клиентов (ClientLogos) → закрывающая
// строка «Следующий успешный проект — ваш».
// Строки берём из funnel.hero.trustLabel / trustClosing.
// =====================================================

import { useTranslations } from 'next-intl';
import { ClientLogos } from './client-logos';

export function ClientTrust() {
  const t = useTranslations('funnel.hero');

  return (
    <section className="container mx-auto px-4 py-14 md:py-20" aria-label={t('trustLabel')}>
      {/* Микро-лейбл над логотипами */}
      <p className="text-center text-xs font-medium uppercase tracking-widest text-[var(--text-2)]">
        {t('trustLabel')}
      </p>

      {/* Стена логотипов клиентов */}
      <ClientLogos />
    </section>
  );
}
