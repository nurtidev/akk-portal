'use client';

// =====================================================
// ===== Отображение ставки (fmtRate из @/lib/format) ==
// fmtRate возвращает {text, hasRange, tip}; HTML/тултип рисуем здесь.
// При наличии диапазона — текст «≈ N%» с тултипом (rateTip || rateRange).
// =====================================================

import * as Tooltip from '@radix-ui/react-tooltip';
import { fmtRate } from '@/lib/format';
import type { Program } from '@/data/programs';

export function RateDisplay({ program }: { program: Pick<Program, 'rate' | 'rateRange' | 'rateTip'> }) {
  const r = fmtRate(program);
  // Тултип показываем при диапазоне (≈%) ИЛИ когда у программы есть пояснение к
  // ставке (rateTip) — даже у субсидируемых «от %» (прозрачность ставки).
  // Видимый текст (r.text) не меняется — паритет с легаси сохранён.
  const tip = r.hasRange ? r.tip : program.rateTip;
  if (!tip) {
    return <span>{r.text}</span>;
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-dotted decoration-[var(--accent-2)] underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        >
          {r.text}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-[120] max-w-[260px] rounded-[var(--radius-sm)] bg-[var(--text)] px-3 py-2 text-xs leading-snug text-[var(--bg)] shadow-lg"
        >
          {tip}
          <Tooltip.Arrow className="fill-[var(--text)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
