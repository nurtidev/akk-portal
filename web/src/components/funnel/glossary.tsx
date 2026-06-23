'use client';

// =====================================================
// ===== Глоссарий аббревиатур (тултипы) ===============
// Перенос GLOSSARY + applyGlossary из index.html (≈ 3123–3153).
// Радикс-тултип вместо рукописного fixed-элемента; термины и расшифровки —
// дословно из легаси. Используется в rateNote / scheduleNote.
// =====================================================

import { Fragment, type ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

const GLOSSARY: Record<string, string> = {
  'ОС/СМР': 'Основные средства и строительно-монтажные работы',
  СМР: 'Строительно-монтажные работы',
  'СС/ПС': 'Собственные и привлечённые средства Общества',
  'НФ РК': 'Национальный фонд Республики Казахстан',
  'НБ РК': 'Национальный банк Республики Казахстан',
  НБРК: 'Национальный банк Республики Казахстан',
  ВПРиУР: 'Весенне-полевые и уборочные работы',
  ГЭСВ: 'Годовая эффективная ставка вознаграждения — реальная стоимость кредита со всеми платежами',
  ПСС: 'Привлечённые субсидируемые средства',
  ПОС: 'Пополнение оборотных средств',
  МФО: 'Микрофинансовая организация',
  БВУ: 'Банк второго уровня',
  РИЦ: 'Региональный инвестиционный центр',
  СПК: 'Социально-предпринимательская корпорация',
  ДКЗ: 'Программа «Дорожная карта бизнеса»',
  ЭПВ: 'Программа «Экономика простых вещей»',
  МРП: 'Месячный расчётный показатель (в 2026 году — 4 325 ₸)',
  Даму: 'АО «ФРП «Даму» — фонд, который даёт гарантию по кредиту',
  КТ: 'Кредитное товарищество',
  РБ: 'Республиканский бюджет',
  маржа: 'Надбавка партнёра (КТ/МФО/банка) к ставке АКК — из неё он покрывает свои расходы',
  маржой: 'Надбавка партнёра (КТ/МФО/банка) к ставке АКК — из неё он покрывает свои расходы',
};

// Длинные термины первыми, чтобы не разрезать составные (ОС/СМР, НБ РК и т.п.).
const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const ESCAPED = TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
const RE = new RegExp('(' + ESCAPED.join('|') + ')', 'g');

/** Подсвечиваемый термин с тултипом-расшифровкой. */
export function GlossaryTerm({ term, tip }: { term: string; tip: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-dotted decoration-[var(--accent-2)] underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
        >
          {term}
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

/**
 * Разбивает текст на сегменты, оборачивая известные аббревиатуры в тултип.
 * Аналог applyGlossary() из легаси, но без dangerouslySetInnerHTML.
 */
export function applyGlossary(text: string | undefined): ReactNode {
  if (!text) return text;
  const parts = text.split(RE);
  return parts.map((part, i) => {
    if (GLOSSARY[part]) {
      return <GlossaryTerm key={i} term={part} tip={GLOSSARY[part]} />;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
