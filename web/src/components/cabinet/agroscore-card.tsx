"use client";

// =====================================================
// ===== G16: карточка АгроСкора =======================
// Визуальный кредитный риск-профиль фермера.
// Все данные — мок реестров (синтетика для демо).
// =====================================================

import { calculateAgroScore } from "@/lib/agroscore";
import type { AgroPersona } from "@/data/agroscore-personas";
import type { AgroScoreResult } from "@/lib/agroscore";

const BAND_COLOR: Record<string, string> = {
  A: "#07663D",
  B: "#4CAF50",
  C: "#C9A21C",
  D: "#DC2626",
};

const BAND_LABEL: Record<string, string> = {
  A: "Отличный",
  B: "Хороший",
  C: "Средний",
  D: "Высокий риск",
};

// ── SVG дуговой gauge ────────────────────────────────────────────────────────
function ScoreGauge({ score, band }: { score: number; band: string }) {
  const color = BAND_COLOR[band] ?? "#07663D";
  const r = 56;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  // Показываем 75% окружности (270°) как шкалу
  const arcLength = circumference * 0.75;
  const progress = (score / 100) * arcLength;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={140} height={120} viewBox="0 0 140 140" aria-label={`АгроСкор ${score}`}>
        {/* Фоновая дуга */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--bg-tint)"
          strokeWidth={12}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Прогресс-дуга */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={`${progress} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        {/* Число балла */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={28}
          fontWeight={700}
          fill="var(--text)"
          fontFamily="var(--font-display, Montserrat, sans-serif)"
        >
          {score}
        </text>
        {/* Метка «из 100» */}
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-3)"
          fontFamily="var(--font-body, Onest, sans-serif)"
        >
          из 100
        </text>
      </svg>
      {/* Бейдж рейтинга */}
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
        style={{ backgroundColor: color }}
      >
        <span className="text-base">{band}</span>
        <span className="font-medium opacity-90">{BAND_LABEL[band]}</span>
      </span>
    </div>
  );
}

// ── Спарклайн тренда ─────────────────────────────────────────────────────────
function Sparkline({ points }: { points: number[] }) {
  const W = 120;
  const H = 40;
  const max = 100;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  });
  const polyline = coords.join(" ");
  const lastPt = coords[coords.length - 1].split(",");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-label="Динамика балла"
      className="overflow-visible"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={parseFloat(lastPt[0])}
        cy={parseFloat(lastPt[1])}
        r={3}
        fill="var(--primary)"
      />
    </svg>
  );
}

// ── Бар фактора ──────────────────────────────────────────────────────────────
function FactorBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "#07663D" : value >= 45 ? "#C9A21C" : "#DC2626";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tint)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export function AgroScoreCard({ persona }: { persona: AgroPersona }) {
  const result: AgroScoreResult = calculateAgroScore(persona);
  const { score, band, factors, preApproved, isThinFile, trendPoints } = result;

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div>
        <h2 className="font-display text-2xl font-bold text-[var(--text)]">
          АгроСкор
        </h2>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">
          Кредитный риск-профиль фермера · мок-данные реестров
        </p>
      </div>

      {/* Мок-предупреждение */}
      <div className="rounded-[var(--radius)] border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2.5 text-xs text-[var(--text-2)]">
        Данные синтетические — демонстрационный режим для презентации совету директоров АКК.
      </div>

      {/* Gauge + профиль */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
        <ScoreGauge score={score} band={band} />
        <div className="flex-1 space-y-1.5">
          <p className="font-display text-lg font-semibold text-[var(--text)]">
            {persona.profile.name}
          </p>
          <p className="text-sm text-[var(--text-3)]">
            ИИН: {persona.profile.iin}
          </p>
          <p className="text-sm text-[var(--text-3)]">
            Регион: {persona.profile.region}
          </p>
          <p className="text-sm text-[var(--text-3)]">
            Возраст: {persona.profile.age} лет
          </p>
          {/* Тренд */}
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-[var(--text-3)]">
              Динамика балла
            </p>
            <Sparkline points={trendPoints} />
          </div>
        </div>
      </div>

      {/* Предодобренный лимит */}
      {preApproved && (
        <div className="rounded-[var(--radius)] bg-[#07663D]/10 border border-[#07663D]/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            Предодобренный лимит
          </p>
          <p className="mt-1 font-display text-xl font-bold text-[var(--text)]">
            {(preApproved.limit_tg / 1_000_000).toFixed(0)} млн ₸
            <span className="ml-3 text-base font-medium text-[var(--text-2)]">
              · Ставка: {preApproved.rate_pct}% годовых
            </span>
          </p>
        </div>
      )}

      {/* Тонкое досье */}
      {isThinFile && (
        <div className="rounded-[var(--radius)] border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-sm text-[var(--text-2)]">
          <p className="font-semibold text-[var(--text)]">
            Тонкое досье: нет истории в АКК
          </p>
          <p className="mt-0.5">
            Подайте заявку на первый микрокредит — займ создаст кредитную историю и повысит балл.
          </p>
        </div>
      )}

      {/* Отказ (D-бэнд) */}
      {band === "D" && !preApproved && (
        <div className="rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-[var(--text-2)]">
          <p className="font-semibold text-[var(--text)]">
            По текущим данным одобрение затруднено
          </p>
          <p className="mt-0.5">
            Снизьте долговую нагрузку и обратитесь через 6 месяцев.
          </p>
        </div>
      )}

      {/* Факторы */}
      <div>
        <h3 className="mb-3 font-display text-base font-semibold text-[var(--text)]">
          Детализация факторов
        </h3>
        <div className="space-y-3">
          {factors.map((f) => (
            <div
              key={f.key}
              className="rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-3"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text)]">
                  {f.label}
                </span>
                <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
                  <span className="font-semibold text-[var(--text)]">
                    {f.contribution}
                  </span>
                  <span>· вес {Math.round(f.weight * 100)}%</span>
                </div>
              </div>
              <FactorBar value={f.contribution} />
              <p className="mt-1.5 flex items-start gap-2 text-xs text-[var(--text-3)]">
                <span aria-hidden="true" className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                {f.hint}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Что это даёт */}
      <div className="rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
        <h3 className="mb-2.5 font-display text-sm font-semibold text-[var(--text)]">
          Что даёт высокий АгроСкор
        </h3>
        <ul className="space-y-1.5 text-sm text-[var(--text-2)]">
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">✓</span>
            Ниже ставка по кредиту
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">✓</span>
            Выше одобренный лимит
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--primary)]">✓</span>
            Быстрее решение по заявке
          </li>
        </ul>
      </div>
    </div>
  );
}
