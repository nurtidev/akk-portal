'use client';

// =====================================================
// ===== Карточки целей «На что вам нужны средства?» ====
// Стиль — ряд «парящих» 3D-объектов (трактор/корова/росток…) на прозрачном
// фоне страницы. Под каждым объектом — мягкий круг-пьедестал (тонкое
// брендовое свечение + контактная тень), ниже подпись и CTA. Без тяжёлых
// цветных панелей: объекты сами несут цвет, фон остаётся воздушным.
// Прозрачный PNG лежит в public/img/goals/<value>.png; если файла нет —
// мягкий фолбэк на встроенную плоскую SVG-иллюстрацию.
// Клик = запуск квиза с предвыбранной целью (startQuizWith).
// Тексты берутся из вопроса квиза (единый источник правды).
// Работает в светлой и тёмной теме.
// =====================================================

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { QUESTIONS } from '@/data/questions';
import { useFunnel } from './funnel-context';
import { useQuestionL10n } from './use-question-l10n';

const purposeQuestion = QUESTIONS.find((q) => q.key === 'purpose');

// ------------------------------------------------------------------
// Цветные плоские SVG-иллюстрации (64×64, viewBox 0 0 64 64)
// Единая манера: плоская заливка 2–4 цветов, без тонких деталей.
// Зелёный = var(--primary) / #07663D, золото = var(--accent) / #C9A21C
// ------------------------------------------------------------------
function GoalIllustration({ value, size = 72 }: { value: string; size?: number }) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    'aria-hidden': true,
    role: 'img' as const,
  };

  switch (value) {
    // Весенне-полевые и уборочные работы — КОЛОСЬЯ пшеницы (золотые)
    case 'vprir':
      return (
        <svg {...svgProps}>
          {/* Стебель центральный */}
          <rect x="31" y="30" width="2" height="22" rx="1" fill="#07663D" />
          {/* Стебель левый */}
          <rect x="22" y="35" width="2" height="18" rx="1" fill="#07663D" />
          {/* Стебель правый */}
          <rect x="40" y="35" width="2" height="18" rx="1" fill="#07663D" />
          {/* Листья-усики */}
          <path d="M32 44 Q24 42 22 37" stroke="#07663D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M32 44 Q40 42 42 37" stroke="#07663D" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Колос центральный — зёрна */}
          <ellipse cx="32" cy="28" rx="3.5" ry="5" fill="#C9A21C" />
          <ellipse cx="29" cy="23" rx="3" ry="4.5" fill="#C9A21C" />
          <ellipse cx="35" cy="23" rx="3" ry="4.5" fill="#C9A21C" />
          <ellipse cx="32" cy="17" rx="2.5" ry="4" fill="#E8B820" />
          <ellipse cx="29.5" cy="13.5" rx="2" ry="3.5" fill="#E8B820" />
          <ellipse cx="34.5" cy="13.5" rx="2" ry="3.5" fill="#E8B820" />
          <ellipse cx="32" cy="10" rx="2" ry="3" fill="#F5CC40" />
          {/* Ости (усики колоса) */}
          <line x1="27" y1="13" x2="23" y2="8" stroke="#C9A21C" strokeWidth="1" strokeLinecap="round" />
          <line x1="37" y1="13" x2="41" y2="8" stroke="#C9A21C" strokeWidth="1" strokeLinecap="round" />
          <line x1="32" y1="7" x2="32" y2="4" stroke="#C9A21C" strokeWidth="1" strokeLinecap="round" />
          {/* Колос левый */}
          <ellipse cx="23" cy="34" rx="2.5" ry="4" fill="#E8B820" />
          <ellipse cx="21" cy="30" rx="2" ry="3.5" fill="#E8B820" />
          <ellipse cx="25" cy="30" rx="2" ry="3.5" fill="#F5CC40" />
          <ellipse cx="23" cy="26.5" rx="1.8" ry="3" fill="#F5CC40" />
          {/* Колос правый */}
          <ellipse cx="41" cy="34" rx="2.5" ry="4" fill="#E8B820" />
          <ellipse cx="39" cy="30" rx="2" ry="3.5" fill="#E8B820" />
          <ellipse cx="43" cy="30" rx="2" ry="3.5" fill="#F5CC40" />
          <ellipse cx="41" cy="26.5" rx="1.8" ry="3" fill="#F5CC40" />
          {/* Земля */}
          <rect x="16" y="52" width="32" height="5" rx="2.5" fill="#8BC34A" opacity="0.4" />
        </svg>
      );

    // Покупка скота — КОРОВА с пятнами
    case 'livestock':
      return (
        <svg {...svgProps}>
          {/* Тело коровы */}
          <ellipse cx="32" cy="38" rx="18" ry="13" fill="#F5F0E8" />
          {/* Голова */}
          <ellipse cx="32" cy="22" rx="11" ry="9" fill="#F5F0E8" />
          {/* Уши */}
          <ellipse cx="20" cy="20" rx="4" ry="3" fill="#F5F0E8" />
          <ellipse cx="20" cy="20" rx="2.5" ry="2" fill="#F9C6C6" />
          <ellipse cx="44" cy="20" rx="4" ry="3" fill="#F5F0E8" />
          <ellipse cx="44" cy="20" rx="2.5" ry="2" fill="#F9C6C6" />
          {/* Рога */}
          <path d="M23 14 Q19 9 17 11" stroke="#C9A21C" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M41 14 Q45 9 47 11" stroke="#C9A21C" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Пятна */}
          <ellipse cx="26" cy="35" rx="7" ry="5" fill="#4A4035" opacity="0.35" />
          <ellipse cx="39" cy="42" rx="5" ry="4" fill="#4A4035" opacity="0.3" />
          <ellipse cx="29" cy="22" rx="4" ry="3" fill="#4A4035" opacity="0.25" />
          {/* Морда */}
          <ellipse cx="32" cy="26" rx="6" ry="4" fill="#F2D8C8" />
          {/* Ноздри */}
          <ellipse cx="30" cy="26.5" rx="1.2" ry="0.8" fill="#C9A0A0" />
          <ellipse cx="34" cy="26.5" rx="1.2" ry="0.8" fill="#C9A0A0" />
          {/* Глаза */}
          <circle cx="27" cy="19.5" r="1.5" fill="#333" />
          <circle cx="37" cy="19.5" r="1.5" fill="#333" />
          <circle cx="27.5" cy="19" r="0.5" fill="white" />
          <circle cx="37.5" cy="19" r="0.5" fill="white" />
          {/* Ноги */}
          <rect x="19" y="49" width="5" height="9" rx="2.5" fill="#E8E0D0" />
          <rect x="26" y="50" width="5" height="8" rx="2.5" fill="#E8E0D0" />
          <rect x="33" y="50" width="5" height="8" rx="2.5" fill="#E8E0D0" />
          <rect x="40" y="49" width="5" height="9" rx="2.5" fill="#E8E0D0" />
          {/* Хвост */}
          <path d="M50 36 Q55 40 53 46" stroke="#C9A060" strokeWidth="2" fill="none" strokeLinecap="round" />
          <ellipse cx="52.5" cy="47" rx="2" ry="3" fill="#C9A060" />
          {/* Зелёная трава */}
          <rect x="12" y="57" width="40" height="4" rx="2" fill="#07663D" opacity="0.3" />
        </svg>
      );

    // Откорм / птицеводство — КУРИЦА
    case 'feedlot':
      return (
        <svg {...svgProps}>
          {/* Тело */}
          <ellipse cx="32" cy="42" rx="16" ry="13" fill="#F5CC40" />
          {/* Крыло */}
          <ellipse cx="26" cy="42" rx="8" ry="6" fill="#E8B820" transform="rotate(-10 26 42)" />
          {/* Голова */}
          <circle cx="32" cy="22" r="9" fill="#F5CC40" />
          {/* Гребень */}
          <path d="M28 14 Q30 10 32 13 Q33 9 35 12 Q37 8 38 12" stroke="#E53935" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="13.5" r="2.5" fill="#E53935" />
          <circle cx="33" cy="11.5" r="2.5" fill="#E53935" />
          <circle cx="36.5" cy="12" r="2.5" fill="#E53935" />
          {/* Клюв */}
          <path d="M38 23 L44 25 L38 27 Z" fill="#E8A020" />
          {/* Серёжки */}
          <ellipse cx="38" cy="27.5" rx="2" ry="3" fill="#E53935" />
          {/* Глаз */}
          <circle cx="30" cy="21" r="2.5" fill="#1A1A1A" />
          <circle cx="30.8" cy="20.3" r="0.8" fill="white" />
          {/* Хвост — перья */}
          <path d="M16 38 Q9 32 10 26" stroke="#C9A21C" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M16 40 Q8 36 7 30" stroke="#07663D" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M17 43 Q9 42 8 37" stroke="#E8B820" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Ноги */}
          <path d="M28 54 L26 62 M28 54 L30 62 M28 54 L24 60" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" />
          <path d="M36 54 L34 62 M36 54 L38 62 M36 54 L32 60" stroke="#E8A020" strokeWidth="2" strokeLinecap="round" />
          {/* Яйца — три штуки внизу */}
          <ellipse cx="44" cy="54" rx="3.5" ry="4.5" fill="#FFF8E1" />
          <ellipse cx="50" cy="55" rx="3" ry="4" fill="#FFF8E1" />
          <ellipse cx="56" cy="53" rx="3" ry="4" fill="#FFF8E1" />
        </svg>
      );

    // Инвестиции / покупка техники — ТРАКТОР
    case 'investments':
      return (
        <svg {...svgProps}>
          {/* Большое заднее колесо */}
          <circle cx="21" cy="44" r="14" fill="#333" />
          <circle cx="21" cy="44" r="10" fill="#555" />
          <circle cx="21" cy="44" r="4" fill="#07663D" />
          {/* Спицы колеса */}
          <line x1="21" y1="34" x2="21" y2="30" stroke="#888" strokeWidth="2" />
          <line x1="21" y1="54" x2="21" y2="58" stroke="#888" strokeWidth="2" />
          <line x1="11" y1="44" x2="7" y2="44" stroke="#888" strokeWidth="2" />
          <line x1="31" y1="44" x2="35" y2="44" stroke="#888" strokeWidth="2" />
          {/* Малое переднее колесо */}
          <circle cx="49" cy="49" r="9" fill="#333" />
          <circle cx="49" cy="49" r="6" fill="#555" />
          <circle cx="49" cy="49" r="2.5" fill="#07663D" />
          {/* Кузов трактора */}
          <rect x="25" y="30" width="26" height="16" rx="3" fill="#07663D" />
          {/* Кабина */}
          <rect x="35" y="19" width="16" height="14" rx="3" fill="#07663D" />
          {/* Окно кабины */}
          <rect x="37" y="21" width="12" height="8" rx="2" fill="#B3E5FC" opacity="0.85" />
          {/* Выхлопная труба */}
          <rect x="37" y="12" width="4" height="9" rx="2" fill="#555" />
          <ellipse cx="39" cy="11" rx="3" ry="2" fill="#777" />
          {/* Дым */}
          <circle cx="39" cy="8" r="2.5" fill="#DDD" opacity="0.6" />
          <circle cx="41" cy="5" r="2" fill="#DDD" opacity="0.4" />
          {/* Капот / крышка двигателя */}
          <rect x="25" y="33" width="12" height="7" rx="2" fill="#0A8050" />
          {/* Фары */}
          <circle cx="52" cy="33" r="2" fill="#F5CC40" />
          <circle cx="52" cy="33" r="1" fill="#FFF" />
          {/* Горизонтальная полоска на кузове */}
          <rect x="25" y="38" width="26" height="2" rx="1" fill="#0A8050" />
          {/* Земля */}
          <rect x="6" y="57" width="52" height="4" rx="2" fill="#8BC34A" opacity="0.35" />
        </svg>
      );

    // Пополнение оборотных средств — МОНЕТЫ И МЕШОК
    case 'working':
      return (
        <svg {...svgProps}>
          {/* Мешок */}
          <ellipse cx="29" cy="43" rx="16" ry="14" fill="#C9A21C" />
          <ellipse cx="29" cy="43" rx="13" ry="11" fill="#E8B820" />
          {/* Верхушка мешка (горлышко) */}
          <rect x="23" y="26" width="12" height="10" rx="4" fill="#C9A21C" />
          <rect x="24" y="24" width="10" height="6" rx="3" fill="#A07A10" />
          {/* Завязка мешка */}
          <path d="M22 28 Q29 25 36 28" stroke="#5C3D0A" strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* Знак ₸ на мешке */}
          <text x="29" y="47" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#07663D" fontFamily="sans-serif">₸</text>
          {/* Монеты — стопка справа */}
          <ellipse cx="48" cy="52" rx="8" ry="3" fill="#C9A21C" />
          <rect x="40" y="46" width="16" height="6" rx="0" fill="#E8B820" />
          <ellipse cx="48" cy="46" rx="8" ry="3" fill="#F5CC40" />
          <rect x="40" y="40" width="16" height="6" rx="0" fill="#E8B820" />
          <ellipse cx="48" cy="40" rx="8" ry="3" fill="#F5CC40" />
          <rect x="40" y="34" width="16" height="6" rx="0" fill="#E8B820" />
          <ellipse cx="48" cy="34" rx="8" ry="3" fill="#F5CC40" />
          {/* Блик на монетах */}
          <line x1="44" y1="34" x2="52" y2="34" stroke="white" strokeWidth="0.8" opacity="0.5" />
          <line x1="44" y1="40" x2="52" y2="40" stroke="white" strokeWidth="0.8" opacity="0.5" />
          <line x1="44" y1="46" x2="52" y2="46" stroke="white" strokeWidth="0.8" opacity="0.5" />
          {/* Стрелки оборота */}
          <path d="M12 36 Q8 28 14 22 Q20 16 28 18" stroke="#07663D" strokeWidth="2.5" fill="none" strokeLinecap="round" markerEnd="url(#arrow)" />
          <path d="M16 50 Q10 56 16 61" stroke="#07663D" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* Маленькие монеты летят */}
          <circle cx="13" cy="20" r="3.5" fill="#F5CC40" />
          <circle cx="13" cy="20" r="1.5" fill="#C9A21C" />
          <circle cx="7" cy="27" r="2.5" fill="#F5CC40" opacity="0.7" />
        </svg>
      );

    // Микрокредит / стартап — РОСТОК В ЛАДОНЯХ
    default: // micro
      return (
        <svg {...svgProps}>
          {/* Ладони — две (снизу) */}
          <path d="M12 50 Q10 44 14 40 Q17 36 20 38 L22 42" fill="#F2D0B0" stroke="#E8B898" strokeWidth="1" />
          <path d="M52 50 Q54 44 50 40 Q47 36 44 38 L42 42" fill="#F2D0B0" stroke="#E8B898" strokeWidth="1" />
          <ellipse cx="32" cy="50" rx="20" ry="8" fill="#F2D0B0" />
          <ellipse cx="32" cy="50" rx="20" ry="7" fill="#F9DFC0" />
          {/* Линии ладони */}
          <path d="M22 50 Q28 47 32 49 Q36 47 42 50" stroke="#E8B898" strokeWidth="1" fill="none" />
          <path d="M24 52 Q32 49 40 52" stroke="#E8B898" strokeWidth="0.8" fill="none" />
          {/* Горшок — небольшой */}
          <path d="M25 48 L27 38 L37 38 L39 48 Z" fill="#C9A21C" />
          <rect x="24" y="36" width="16" height="4" rx="2" fill="#A07A10" />
          {/* Земля в горшке */}
          <ellipse cx="32" cy="38" rx="7" ry="2.5" fill="#5C3D0A" />
          {/* Стебель */}
          <path d="M32 38 Q31 30 32 22" stroke="#07663D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Листья */}
          <path d="M32 30 Q24 26 22 20 Q30 18 34 26" fill="#07663D" />
          <path d="M32 25 Q40 21 42 15 Q34 13 30 21" fill="#4CAF50" />
          {/* Молодой листочек на верхушке */}
          <path d="M32 22 Q29 17 30 13 Q34 14 34 20" fill="#8BC34A" />
          {/* Капли воды */}
          <path d="M46 18 Q47 15 46 13 Q44 15 45 18 Z" fill="#4FC3F7" opacity="0.8" />
          <path d="M50 25 Q51 22 50 20 Q48 22 49 25 Z" fill="#4FC3F7" opacity="0.6" />
          <path d="M44 30 Q45 27 44 25 Q42 27 43 30 Z" fill="#4FC3F7" opacity="0.5" />
          {/* Блик на ладони */}
          <ellipse cx="28" cy="49" rx="4" ry="1.5" fill="white" opacity="0.3" />
        </svg>
      );
  }
}

// ------------------------------------------------------------------
// Мягкий цветовой акцент пьедестала по целям — лёгкое брендовое свечение
// под объектом (низкая непрозрачность, чтобы не спорить с самим объектом и
// не сливаться: зелёный трактор — на тёплом золотом ореоле и т.п.).
// ------------------------------------------------------------------
const GOAL_ACCENT: Record<string, string> = {
  vprir: '#C9A21C', // золото колосьев
  livestock: '#0A8050', // зелень луга
  feedlot: '#E8A020', // тёплый янтарь
  investments: '#C9A21C', // золото под зелёный трактор (контраст)
  working: '#C9A21C', // золото монет
  micro: '#6FBF3B', // свежий росток
};
const GOAL_ACCENT_DEFAULT = '#0A8050';

// ------------------------------------------------------------------
// «Парящий» объект цели: прозрачный PNG из public/img/goals/<value>.png.
// Пока файла нет (404 или битый файл) — мягкий фолбэк на встроенную
// SVG-иллюстрацию того же размера. Лёгкий подъём+зум по hover — живость
// (тень даёт пьедестал, не сам объект).
// ------------------------------------------------------------------
function GoalArt({ value, small = false }: { value: string; small?: boolean }) {
  const [imgOk, setImgOk] = useState(true);
  const ref = useRef<HTMLImageElement | null>(null);

  // onError может сработать до гидратации и потеряться — проверяем naturalWidth.
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) setImgOk(false);
  }, []);

  // Два размера: крупный (первый уровень плиток) и компактный (второй уровень).
  const sizeClass = small
    ? 'h-[72px] w-[72px] md:h-[80px] md:w-[80px]'
    : 'h-[104px] w-[104px] md:h-[116px] md:w-[116px]';

  const artClass =
    'relative z-10 object-contain ' +
    sizeClass +
    ' transition-transform duration-300 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.06] ' +
    'motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:scale-100';

  if (!imgOk) {
    return (
      <span className={artClass + ' flex items-center justify-center'}>
        <GoalIllustration value={value} size={small ? 80 : 110} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={`/img/goals/${value}.png`}
      alt=""
      aria-hidden="true"
      className={artClass}
      onError={() => setImgOk(false)}
    />
  );
}

// ------------------------------------------------------------------
// Основной компонент — секция с сеткой карточек
// ------------------------------------------------------------------
// Первый уровень — самые востребованные направления (по данным портфеля:
// растениеводство/посевная → Кең дала 2 и животноводство). Остальные цели —
// вторым, компактным уровнем. Значения совпадают с purpose-опциями квиза.
const PRIMARY_GOALS = ['vprir', 'livestock'];

export function GoalCards() {
  const t = useTranslations('funnel.goals');
  const qt = useQuestionL10n();
  const { startQuizWith } = useFunnel();
  const options = purposeQuestion?.options ?? [];

  const primary = PRIMARY_GOALS.map((v) => options.find((o) => o.value === v)).filter(
    (o): o is NonNullable<typeof o> => Boolean(o),
  );
  const secondary = options.filter((o) => !PRIMARY_GOALS.includes(o.value));

  return (
    <section className="container mx-auto px-4 pt-10 pb-16 md:pt-14 md:pb-20" aria-label={t('title')}>
      {/* Заголовок секции */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-2 text-[var(--text-2)]">{t('sub')}</p>
      </div>

      {/*
        Первый уровень — две крупные плитки-панели (арт слева, текст + CTA справа).
        Это самые частые цели по данным портфеля: посевная (Кең дала 2) и скот.
      */}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 md:gap-6">
        {primary.map((o) => {
          const label = purposeQuestion ? qt.optLabel(purposeQuestion, o.value) : o.label;
          const desc = purposeQuestion ? qt.optDesc(purposeQuestion, o.value) : undefined;
          const accent = GOAL_ACCENT[o.value] ?? GOAL_ACCENT_DEFAULT;

          return (
            <button
              key={o.value}
              type="button"
              onClick={() => startQuizWith(o.value)}
              className={[
                'group relative flex items-center gap-4 overflow-hidden text-left',
                'rounded-[var(--radius-lg)] border border-[var(--border)]',
                'bg-[var(--surface)] shadow-[var(--shadow-sm)]',
                'p-5 md:p-6',
                'transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
              ].join(' ')}
            >
              {/* Арт + пьедестал */}
              <span className="relative flex h-[112px] w-[112px] flex-shrink-0 items-end justify-center md:h-[128px] md:w-[128px]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 h-[84px] w-[84px] rounded-full opacity-70 blur-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-100 md:h-[96px] md:w-[96px]"
                  style={{ background: `radial-gradient(circle, ${accent}40 0%, ${accent}1a 45%, transparent 72%)` }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 h-3 w-20 rounded-[50%] bg-black/20 blur-md transition-all duration-300 group-hover:w-16 group-hover:opacity-70"
                />
                <GoalArt value={o.value} />
              </span>

              {/* Текст + CTA */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-lg font-bold leading-snug text-[var(--text)] md:text-xl">
                  {label}
                </span>
                {desc && (
                  <span className="mt-1.5 text-sm leading-snug text-[var(--text-3)]">{desc}</span>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] opacity-80 transition-opacity group-hover:opacity-100">
                  {t('cta')} →
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        Второй уровень — остальные цели, компактным рядом «парящих» объектов.
        2 в ряд на мобиле, 4 на sm+.
      */}
      <div className="mt-4 grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4 sm:gap-x-3 md:mt-6">
        {secondary.map((o) => {
          const label = purposeQuestion ? qt.optLabel(purposeQuestion, o.value) : o.label;
          const accent = GOAL_ACCENT[o.value] ?? GOAL_ACCENT_DEFAULT;

          return (
            <button
              key={o.value}
              type="button"
              onClick={() => startQuizWith(o.value)}
              className={[
                'group flex flex-col items-center text-center',
                'rounded-[var(--radius-lg)] px-2 py-3',
                'transition-colors duration-200 hover:bg-[var(--surface)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
              ].join(' ')}
            >
              {/* Объект + пьедестал (компактный) */}
              <span className="relative flex h-[104px] w-full items-end justify-center">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 h-[66px] w-[66px] rounded-full opacity-60 blur-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-90"
                  style={{ background: `radial-gradient(circle, ${accent}40 0%, ${accent}1a 45%, transparent 72%)` }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 h-2.5 w-16 rounded-[50%] bg-black/20 blur-md transition-all duration-300 group-hover:w-12 group-hover:opacity-70"
                />
                <GoalArt value={o.value} small />
              </span>

              {/* Название цели */}
              <span className="mt-1 block text-xs font-semibold leading-snug text-[var(--text)] sm:text-sm">
                {label}
              </span>

              {/* CTA */}
              <span className="mt-1.5 block text-[11px] font-semibold text-[var(--primary)] opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                {t('cta')} →
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
