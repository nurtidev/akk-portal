'use client';

// =====================================================
// ===== B6: ApplyWizard + Success =====================
// Банковский визард подачи (эталон — __auth-integration.js, startWizard/renderWizard,
// WIZ_STEPS = ['Параметры','Заявитель','Согласия','Подтверждение','Готово']).
//
// ВАЖНО: реальной отправки на бэк здесь НЕТ. Финальный шаг вызывает submit()
// из контекста, который дергает submitApplication (мок по умолчанию; трек D
// подключит реальный POST /applications). Шаги «Заявитель» (данные из госбаз)
// и «Подтверждение по SMS» — демо-заглушки; реальные данные/OTP подтянет трек D
// (auth-gate). См. TODO(трек D) ниже.
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PROGRAMS } from '@/data/programs';
import { fmtAmount } from '@/lib/format';
import { calculateSchedule } from '@/lib/schedule';
import { useFunnel } from './funnel-context';
import { useProgramL10n } from './use-program-l10n';
import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { AuthModal } from '@/components/auth/auth-modal';

const WIZ_TERMS = [12, 24, 36, 60, 84, 120];

/**
 * Визард обёрнут в AuthProvider: шаг «Заявитель» показывает реальные данные
 * вошедшего пользователя, гостю — честное приглашение войти (раньше гость видел
 * «данные подтверждены через eGov», что вводило в заблуждение).
 */
export function ApplyWizard() {
  return (
    <AuthProvider>
      <ApplyWizardInner />
    </AuthProvider>
  );
}

function ApplyWizardInner() {
  const t = useTranslations('funnel.wizard');
  const { user, openAuth } = useAuth();
  const { state, setScreen, submit } = useFunnel();
  const lp = useProgramL10n();
  const programRaw = state.selectedProgram ? PROGRAMS.find((p) => p.id === state.selectedProgram) : null;
  const program = programRaw ? lp.localize(programRaw) : null;
  const calc = state.selectedProgram ? state.calc[state.selectedProgram] : undefined;

  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState<number>(calc?.amount ?? 0);
  const [term, setTerm] = useState<number>(calc?.term ?? 60);
  const [consent, setConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Без выбранной программы (консультация) — упрощённый поток: только контакты не нужны,
  // сразу подаём как индивидуальную консультацию (submit мокнут).
  const steps = [t('stepParams'), t('stepApplicant'), t('stepConsents'), t('stepConfirm'), t('stepDone')];

  // Реальный график программы (как в калькуляторе подбора): у программ АКК платежи
  // полугодовые (Кең дала: 05 декабря / 05 марта) или годовые — НЕ месячный аннуитет.
  // Точную периодичность утверждает Кредитный комитет (регламент П АКК 002-207-22).
  const schedule =
    program && program.rate != null && amount > 0 && term > 0
      ? calculateSchedule(program, amount, term)
      : null;

  const next = async () => {
    setError('');
    if (step === 0) {
      if (amount <= 0) {
        setError(t('errAmount'));
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!user) {
        setError(t('errNeedLogin'));
        openAuth('login');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!consent) {
        setError(t('errConsent'));
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!otpSent) {
        setError(t('errSendFirst'));
        return;
      }
      if (otp.length !== 6 || otp !== demoCode) {
        setError(t('errOtp'));
        return;
      }
      // TODO(трек D): реальный POST /applications — здесь идёт через submit()/submitApplication.
      setSubmitting(true);
      try {
        await submit();
        // submit() переключает screen на 'success'; визард размонтируется.
      } catch {
        setSubmitting(false);
        setError(t('errSubmit'));
      }
    }
  };

  const sendSms = () => {
    // TODO(трек D): реальная отправка SMS-кода. Сейчас — демо-код, как в легаси.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setDemoCode(code);
    setOtp(code);
    setOtpSent(true);
  };

  return (
    <div className="mx-auto max-w-xl">
      <button
        type="button"
        onClick={() => setScreen('results')}
        className="mb-4 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--primary)]"
      >
        {t('backToPrograms')}
      </button>

      {/* Модалка входа: монтируется здесь, открывается openAuth('login') с шага «Заявитель» */}
      <AuthModal />

      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
          {t('eyebrow')}
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text)]">
          {program ? program.title : t('consultationTitle')}
        </h2>
        {program?.category && <p className="mt-1 text-sm text-[var(--text-2)]">{program.category}</p>}

        {/* Прогресс */}
        <div className="mb-6 mt-5 flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 text-center">
              <div
                className={`h-1 rounded-full ${i <= step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
              />
              <div
                className={`mt-1.5 text-[10px] ${
                  i === step ? 'font-bold text-[var(--primary)]' : 'text-[var(--text-3)]'
                }`}
              >
                {s}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="mb-4 text-sm font-medium text-[var(--danger)]">{error}</div>}

        {/* Шаг 1 — параметры */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">{t('amountLabel')}</label>
              <input
                inputMode="numeric"
                value={amount ? amount.toLocaleString('ru-RU') : ''}
                onChange={(e) => setAmount(Number((e.target.value.match(/\d/g) || []).join('')) || 0)}
                placeholder={t('amountPlaceholder')}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">{t('termLabel')}</label>
              <select
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary)]"
              >
                {WIZ_TERMS.map((x) => (
                  <option key={x} value={x}>
                    {t('termOption', { n: x, y: x / 12 })}
                  </option>
                ))}
              </select>
            </div>
            {program && program.rate != null && (
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] px-4 py-3">
                {schedule?.type === 'biannual' ? (
                  <div className="flex flex-col gap-1">
                    {schedule.payments.map((pm) => (
                      <div key={pm.label} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-2)]">{pm.label}</span>
                        <span className="font-bold text-[var(--primary)]">
                          ≈ {fmtAmount(Math.round(pm.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-[var(--primary)]">
                      {schedule ? '≈ ' + fmtAmount(Math.round(schedule.firstYearPayment)) + t('perYear') : '—'}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 text-right text-[11px] text-[var(--text-3)]">
                  {t('rateSchedule', { rate: String(program.rate).replace('.', ',') })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Шаг 2 — заявитель: реальные данные профиля; гость — приглашение войти */}
        {step === 1 && (
          <div>
            {user ? (
              <>
                <p className="mb-4 text-sm text-[var(--text-2)]">{t('applicantSub')}</p>
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4">
                  <Row label={t('applicantFio')} value={user.name || '—'} chip="ГБД ФЛ" />
                  <Row
                    label={t('applicantIin')}
                    value={user.iin ? user.iin.slice(0, 6) + ' ••••••' : '—'}
                  />
                  <Row label={t('applicantPhone')} value={user.phone || '—'} chip="БМГ" />
                </div>
              </>
            ) : (
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
                <div className="font-semibold text-[var(--text)]">{t('applicantLoginTitle')}</div>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-2)]">
                  {t('applicantLoginText')}
                </p>
                <button
                  type="button"
                  onClick={() => openAuth('login')}
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
                >
                  {t('applicantLoginButton')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Шаг 3 — согласия */}
        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-[var(--text-2)]">{t('consentSub')}</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 flex-none accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-bold text-[var(--text)]">{t('consentTitle')}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-[var(--text-3)]">
                  {t('consentText')}
                </span>
              </span>
            </label>
            <p className="mt-2.5 text-[11px] text-[var(--text-3)]">{t('consentNote')}</p>
          </div>
        )}

        {/* Шаг 4 — подтверждение по SMS (демо) */}
        {step === 3 && (
          <div>
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-warm)] px-4 py-3 text-xs leading-relaxed text-[var(--text-2)]">
              {t('smsInfo', { title: program ? program.title : '' })}
            </div>
            {!otpSent ? (
              <button
                type="button"
                onClick={sendSms}
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] font-semibold text-white transition hover:bg-[var(--primary-2)]"
              >
                {t('sendSms')}
              </button>
            ) : (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-[var(--text)]">{t('otpLabel')}</label>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp((e.target.value.match(/\d/g) || []).join('').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center text-xl font-bold tracking-[8px] text-[var(--text)] outline-none focus:border-[var(--primary)]"
                />
                <div className="mt-2 inline-flex rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-2)]">
                  {t('demoCode')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Навигация */}
        {step < 4 && (
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 font-semibold text-[var(--text-2)] transition hover:border-[var(--primary)]"
              >
                {t('back')}
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={next}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] font-semibold text-white transition hover:bg-[var(--primary-2)] disabled:opacity-60"
            >
              {step === 3 ? (submitting ? t('submitting') : t('confirmSubmit')) : t('next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, chip }: { label: string; value: string; chip?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] py-2.5 last:border-0">
      <span className="text-xs text-[var(--text-3)]">{label}</span>
      <span className="flex items-center gap-2 text-right">
        <b className="text-[13px] font-semibold text-[var(--text)]">{value}</b>
        {chip && (
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
            {chip}
          </span>
        )}
      </span>
    </div>
  );
}
