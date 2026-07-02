'use client';

// =====================================================
// ===== Форма консультации (callback) ==================
// «Получить консультацию» = оставить контакты, оператор перезвонит —
// как callback-форма в легаси (имя / телефон / канал связи / согласие).
// НЕ кредитный визард: человек ещё ничего не выбирал.
// Отправка — общий submit() контекста (lead_submitted/success как у заявки).
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFunnel } from './funnel-context';

const CHANNELS = ['call', 'whatsapp', 'telegram'] as const;

/** Мягкая маска телефона: +7 (XXX) XXX-XX-XX по мере ввода, без жёсткой валидации.
    Ведущую 7/8 срезаем ТОЛЬКО при 11 цифрах (полный номер с кодом страны):
    казахстанские мобильные сами начинаются с 7 (701, 705, 777…). */
function formatPhone(raw: string): string {
  let d = (raw.match(/\d/g) || []).join('');
  if ((d.startsWith('7') || d.startsWith('8')) && d.length > 10) d = d.slice(1);
  d = d.slice(0, 10);
  let out = '+7';
  if (d.length > 0) out += ' (' + d.slice(0, 3);
  if (d.length >= 3) out += ') ' + d.slice(3, 6);
  if (d.length >= 6) out += '-' + d.slice(6, 8);
  if (d.length >= 8) out += '-' + d.slice(8, 10);
  return out;
}

export function ConsultationForm() {
  const t = useTranslations('funnel.callback');
  const { state, setCallback, setScreen, submit } = useFunnel();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const onSubmit = async () => {
    setError('');
    if (!state.callback.name.trim()) {
      setError(t('errName'));
      return;
    }
    if ((state.callback.phone.match(/\d/g) || []).length < 11) {
      setError(t('errPhone'));
      return;
    }
    if (!consent) {
      setError(t('errConsent'));
      return;
    }
    setSending(true);
    try {
      await submit();
    } catch {
      setSending(false);
      setError(t('errSubmit'));
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={() => setScreen('landing')}
        className="mb-4 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--primary)]"
      >
        {t('back')}
      </button>

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
          {t('eyebrow')}
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text)]">{t('title')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{t('sub')}</p>

        {error && <div className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</div>}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              {t('nameLabel')}
            </label>
            <input
              value={state.callback.name}
              // Маска имени: только буквы (рус/каз/лат), пробел, дефис, апостроф —
              // цифры и прочие символы отсекаются при вводе.
              onChange={(e) => setCallback({ name: e.target.value.replace(/[^\p{L}\s'-]/gu, '') })}
              placeholder={t('namePlaceholder')}
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              {t('phoneLabel')}
            </label>
            <input
              inputMode="tel"
              value={state.callback.phone}
              onChange={(e) => setCallback({ phone: formatPhone(e.target.value) })}
              placeholder="+7 (___) ___-__-__"
              className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-medium text-[var(--text)]">{t('channelLabel')}</div>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((ch) => {
                const on = state.callback.channel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setCallback({ channel: ch })}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      on
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {t(`channels.${ch}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--text-2)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
            />
            <span>{t('consent')}</span>
          </label>
          <button
            type="button"
            onClick={onSubmit}
            disabled={sending}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)] disabled:opacity-60"
          >
            {sending ? t('sending') : t('submit')}
          </button>
          <p className="text-center text-xs text-[var(--text-3)]">{t('note')}</p>
        </div>
      </div>
    </div>
  );
}
