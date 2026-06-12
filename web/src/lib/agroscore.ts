// =====================================================
// ===== G16: движок АгроСкора (чистый TS, без React) ==
// Все данные — мок. Веса должны суммироваться в 1.0.
// =====================================================

import type { AgroPersona } from '@/data/agroscore-personas';

export interface AgroScoreFactor {
  key: string;
  label: string;        // Метка на русском
  contribution: number; // 0–100 (bucket score)
  weight: number;       // 0–1
  hint: string;         // геймификационная подсказка
}

export interface AgroScoreResult {
  score: number;        // 0–100, итоговый
  band: 'A' | 'B' | 'C' | 'D';
  factors: AgroScoreFactor[];
  preApproved: { limit_tg: number; rate_pct: number } | null;
  isThinFile: boolean;  // true если нет истории в АКК
  trendPoints: number[]; // мок-тренд, 5 точек для спарклайна
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Фактор 1: Платёжная дисциплина (вес 0.35) ────────────────────────────────
function calcDiscipline(persona: AgroPersona): { bucket: number; hint: string; isThinFile: boolean } {
  const { akkHistory, creditBureau } = persona;

  if (akkHistory.total_loans === 0) {
    return {
      bucket: 55,
      hint: 'Первый займ в АКК сформирует вашу кредитную историю',
      isThinFile: true,
    };
  }

  let base = (akkHistory.repaid_without_delay / akkHistory.total_loans) * 100;
  if (akkHistory.had_overdue) base -= 20;
  if (creditBureau.had_default) base -= 30;
  base -= creditBureau.overdue_count * 5;

  return {
    bucket: clamp(base, 0, 100),
    hint: base < 60
      ? 'Своевременные погашения повышают балл'
      : 'Отличная дисциплина погашений — продолжайте в том же духе',
    isThinFile: false,
  };
}

// ── Фактор 2: Производственная состоятельность (вес 0.25) ────────────────────
function calcProduction(persona: AgroPersona): { bucket: number; hint: string } {
  const totalHectares = persona.land.reduce((s, p) => s + p.hectares, 0);

  // Взвешенное поголовье
  const weightedLivestock = persona.livestock.reduce((s, l) => {
    const w = l.type === 'КРС' ? 1.5 : l.type === 'лошади' ? 1.2 : 0.8;
    return s + l.count * w;
  }, 0);

  const landScore = Math.min(100, (totalHectares / 500) * 100);
  const livestockScore = Math.min(100, (weightedLivestock / 150) * 100);
  const bucket = landScore * 0.6 + livestockScore * 0.4;

  let hint = 'Производственная база в норме';
  if (totalHectares < 100) hint = 'Увеличение площади угодий повышает балл';
  else if (weightedLivestock < 50) hint = 'Добавьте данные о поголовье → +5–10 баллов';

  return { bucket, hint };
}

// ── Фактор 3: Гос. вовлечённость (вес 0.15) ──────────────────────────────────
function calcGovEngagement(persona: AgroPersona): { bucket: number; hint: string } {
  const yearsWithSubsidies = new Set(persona.subsidies.map((s) => s.year)).size;
  const totalSubsidyAmount = persona.subsidies.reduce((s, r) => s + r.amount_tg, 0);

  const yearScore = Math.min(100, (yearsWithSubsidies / 5) * 100);
  const amountScore = Math.min(100, (totalSubsidyAmount / 5_000_000) * 100);
  const bucket = yearScore * 0.6 + amountScore * 0.4;

  const hint =
    yearsWithSubsidies < 2
      ? 'Получение субсидий МСХ подтверждает активное ведение деятельности'
      : 'Субсидийная история подтверждает активность хозяйства';

  return { bucket, hint };
}

// ── Фактор 4: Финансовая нагрузка DTI (вес 0.15) ─────────────────────────────
function calcDti(persona: AgroPersona): { bucket: number; hint: string } {
  const dti = persona.creditBureau.current_debt_tg / (persona.tax.annual_turnover_tg || 1);

  let bucket: number;
  if (dti < 0.1) bucket = 100;
  else if (dti < 0.3) bucket = 80;
  else if (dti < 0.5) bucket = 60;
  else if (dti < 0.8) bucket = 35;
  else bucket = 10;

  const hint =
    dti > 0.5
      ? 'Снижение текущей долговой нагрузки улучшит балл'
      : 'Долговая нагрузка в допустимых пределах';

  return { bucket, hint };
}

// ── Фактор 5: Внешний риск (вес 0.10) ────────────────────────────────────────
function calcClimateRisk(persona: AgroPersona): { bucket: number; hint: string } {
  const droughtBase: Record<string, number> = {
    низкий: 90,
    средний: 55,
    высокий: 15,
  };
  let bucket = droughtBase[persona.climate.drought_risk] ?? 55;
  bucket += (persona.climate.ndvi - 0.5) * 20;
  bucket = clamp(bucket, 0, 100);

  const hint =
    persona.climate.drought_risk === 'высокий'
      ? 'Регион с высоким риском засухи; диверсификация культур снижает риск'
      : 'Климатические условия региона учтены в балле';

  return { bucket, hint };
}

// ── Тренд-точки ──────────────────────────────────────────────────────────────
function buildTrendPoints(score: number): number[] {
  let raw: number[];
  if (score >= 60) {
    raw = [score - 25, score - 18, score - 10, score - 4, score];
  } else if (score < 40) {
    raw = [score - 5, score - 2, score + 1, score, score];
  } else {
    raw = [score - 15, score - 8, score - 3, score, score];
  }
  return raw.map((v) => clamp(v, 0, 100));
}

// ── Публичная функция ─────────────────────────────────────────────────────────
export function calculateAgroScore(persona: AgroPersona): AgroScoreResult {
  const disciplineResult = calcDiscipline(persona);
  const productionResult = calcProduction(persona);
  const govResult = calcGovEngagement(persona);
  const dtiResult = calcDti(persona);
  const climateResult = calcClimateRisk(persona);

  const factors: AgroScoreFactor[] = [
    {
      key: 'discipline',
      label: 'Платёжная дисциплина',
      contribution: Math.round(disciplineResult.bucket),
      weight: 0.35,
      hint: disciplineResult.hint,
    },
    {
      key: 'production',
      label: 'Производственная состоятельность',
      contribution: Math.round(productionResult.bucket),
      weight: 0.25,
      hint: productionResult.hint,
    },
    {
      key: 'gov',
      label: 'Гос. вовлечённость',
      contribution: Math.round(govResult.bucket),
      weight: 0.15,
      hint: govResult.hint,
    },
    {
      key: 'dti',
      label: 'Финансовая нагрузка DTI',
      contribution: Math.round(dtiResult.bucket),
      weight: 0.15,
      hint: dtiResult.hint,
    },
    {
      key: 'climate',
      label: 'Внешний риск',
      contribution: Math.round(climateResult.bucket),
      weight: 0.10,
      hint: climateResult.hint,
    },
  ];

  const compositeRaw =
    disciplineResult.bucket * 0.35 +
    productionResult.bucket * 0.25 +
    govResult.bucket * 0.15 +
    dtiResult.bucket * 0.15 +
    climateResult.bucket * 0.10;

  const score = Math.round(compositeRaw);

  const band: 'A' | 'B' | 'C' | 'D' =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  const preApprovedMap: Record<'A' | 'B' | 'C', { limit_tg: number; rate_pct: number }> = {
    A: { limit_tg: 50_000_000, rate_pct: 5.5 },
    B: { limit_tg: 15_000_000, rate_pct: 8.0 },
    C: { limit_tg: 5_000_000, rate_pct: 10.5 },
  };

  const preApproved = band === 'D' ? null : preApprovedMap[band];

  return {
    score,
    band,
    factors,
    preApproved,
    isThinFile: disciplineResult.isThinFile,
    trendPoints: buildTrendPoints(score),
  };
}
