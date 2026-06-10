'use client';

// =====================================================
// ===== B1: ProgramGrid + ProgramModal ================
// Сетка программ (renderProgramsPreview в легаси ≈ 3085–3110):
//  - скрытые (hidden) не показываются;
//  - featured идёт первым, с бейджем «Самая популярная»;
//  - indirectOnly → бейдж «только через КТ/МФО/БВУ».
// Клик/Enter по тайлу — модалка деталей (PROGRAM_DETAILS) с CTA «Подать заявку».
// =====================================================

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import { PROGRAMS, PROGRAM_DETAILS, type Program } from '@/data/programs';
import { fmtAmount } from '@/lib/format';
import { useFunnel } from './funnel-context';
import { ProgramIcon } from './program-media';
import { RateDisplay } from './rate-display';
import { applyGlossary } from './glossary';

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function ProgramTile({ p, onOpen }: { p: Program; onOpen: (id: string) => void }) {
  const t = useTranslations('funnel.programs');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(p.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(p.id);
        }
      }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${
        p.featured ? 'border-[var(--primary)]' : 'border-[var(--border)]'
      }`}
    >
      {/* Медиа: фото + иконка-фолбэк под ним */}
      <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white/80">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16">
            <ProgramIcon id={p.id} />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/img/programs/${p.id}.jpg`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {p.featured && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] shadow">
            <StarIcon />
            {t('featured')}
          </span>
        )}
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          {p.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {p.indirectOnly && (
          <span className="mb-2 inline-flex w-fit rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent-2)]">
            {t('indirectBadge')}
          </span>
        )}
        <h3 className="mb-1.5 font-display text-lg font-bold text-[var(--text)]">{p.title}</h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--text-2)]">{p.description}</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-3)]">{t('rate')}</dt>
            <dd className="font-semibold text-[var(--text)]">
              <RateDisplay program={p} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-3)]">{t('amountUpTo')}</dt>
            <dd className="font-semibold text-[var(--text)]">{fmtAmount(p.maxAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-3)]">{t('termUpTo')}</dt>
            <dd className="font-semibold text-[var(--text)]">
              {p.maxTerm} {t('months')}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function ProgramModalBody({ p, onApply }: { p: Program; onApply: (id: string) => void }) {
  const t = useTranslations('funnel.programs');
  const d = PROGRAM_DETAILS[p.id];
  if (!d) return null;
  return (
    <>
      <span className="inline-block rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
        {p.category}
      </span>
      <Dialog.Title className="mt-3 font-display text-2xl font-bold text-[var(--text)]">
        {p.title}
      </Dialog.Title>
      <Dialog.Description className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">
        {d.summary}
      </Dialog.Description>

      <div className="my-5 grid grid-cols-3 gap-3 rounded-[var(--radius)] bg-[var(--surface-warm)] p-4">
        <div>
          <div className="text-xs text-[var(--text-3)]">{t('amountUpTo')}</div>
          <div className="mt-0.5 text-sm font-bold text-[var(--text)]">{fmtAmount(p.maxAmount)}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-3)]">{t('rate')}</div>
          <div className="mt-0.5 text-sm font-bold text-[var(--text)]">
            <RateDisplay program={p} />
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-3)]">{t('termUpTo')}</div>
          <div className="mt-0.5 text-sm font-bold text-[var(--text)]">
            {p.maxTerm} {t('months')}
          </div>
        </div>
      </div>

      <ModalSection title={t('spendTitle')}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text-2)]">
          {d.spend.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </ModalSection>
      <ModalSection title={t('requirementsTitle')}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--text-2)]">
          {d.requirements.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </ModalSection>
      <ModalSection title={t('repaymentTitle')}>
        <p className="text-sm leading-relaxed text-[var(--text-2)]">{d.repayment}</p>
      </ModalSection>
      {d.note && (
        <div className="mt-4 rounded-[var(--radius)] border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--text-2)]">
          <strong className="text-[var(--text)]">{t('noteLabel')} </strong>
          {applyGlossary(d.note)}
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => onApply(p.id)}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 font-semibold text-white transition hover:bg-[var(--primary-2)]"
        >
          {t('applyCta')}
        </button>
      </div>
    </>
  );
}

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 font-display text-base font-semibold text-[var(--text)]">{title}</h4>
      {children}
    </div>
  );
}

export function ProgramGrid() {
  const t = useTranslations('funnel.programs');
  const { openProgramDetail, applyDirect } = useFunnel();
  const [openId, setOpenId] = useState<string | null>(null);

  // Видимые программы: hidden скрыты; featured — первым (как в легаси).
  const visible = PROGRAMS.filter((p) => !p.hidden);
  const ordered = visible.filter((p) => p.featured).concat(visible.filter((p) => !p.featured));
  const active = openId ? PROGRAMS.find((p) => p.id === openId) || null : null;

  const open = (id: string) => {
    setOpenId(id);
    openProgramDetail(id);
  };

  return (
    <section id="programs" className="bg-[var(--bg-tint)] py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--accent-2)]">
            {t('eyebrow')}
          </div>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-[var(--text-2)]">{t('lede')}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((p) => (
            <ProgramTile key={p.id} p={p} onOpen={open} />
          ))}
        </div>
      </div>

      <Dialog.Root open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl md:p-8">
            <Dialog.Close
              aria-label={t('close')}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] transition hover:bg-[var(--bg-tint)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            >
              ✕
            </Dialog.Close>
            {active && (
              <ProgramModalBody
                p={active}
                onApply={(id) => {
                  setOpenId(null);
                  applyDirect(id);
                }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
