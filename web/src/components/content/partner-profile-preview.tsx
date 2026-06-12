"use client";

import { calculateAgroScore } from "@/lib/agroscore";
import { AGRO_PERSONAS } from "@/data/agroscore-personas";
import { fmtAmount } from "@/lib/format";
import { ContentCard } from "./content-page";

export function PartnerProfilePreview() {
  const persona = AGRO_PERSONAS[0];
  const result = calculateAgroScore(persona);

  const maskedName = "А***** С******";
  const maskedIin = persona.profile.iin.slice(0, 6) + "*****";
  const topFactors = result.factors.slice(0, 3);

  const bandColor =
    result.band === "A"
      ? "var(--primary)"
      : result.band === "B"
        ? "#4caf50"
        : result.band === "C"
          ? "var(--accent)"
          : "var(--text-3)";

  const bandBg =
    result.band === "A"
      ? "var(--primary-soft)"
      : result.band === "B"
        ? "#e8f5e9"
        : result.band === "C"
          ? "var(--primary-tint)"
          : "var(--border)";

  return (
    <ContentCard className="border-[var(--accent)]/30">
      {/* Заголовок карточки */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[var(--text-3)] text-xs mb-1">
            Демонстрационный профиль &mdash; Концепция
          </p>
          <p className="font-semibold text-[var(--text)] text-sm">{maskedName}</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            {persona.profile.region} &middot; ЖСН: {maskedIin}
          </p>
        </div>

        {/* Балл + рейтинг */}
        <div className="text-right flex-shrink-0">
          <div
            className="font-display font-extrabold leading-none text-3xl"
            style={{ color: bandColor }}
          >
            {result.score}
          </div>
          <span
            className="inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: bandBg, color: bandColor }}
          >
            Рейтинг {result.band}
          </span>
        </div>
      </div>

      {/* Факторы */}
      <div className="mb-4">
        <p className="text-[var(--text-3)] text-[0.68rem] font-semibold uppercase tracking-widest mb-2">
          Факторы оценки
        </p>
        <ul className="flex flex-col gap-2">
          {topFactors.map((f) => (
            <li key={f.key}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-[var(--text-2)]">{f.label}</span>
                <span className="text-xs text-[var(--text-3)] flex-shrink-0">{f.contribution}</span>
              </div>
              <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--primary)]"
                  style={{ width: `${f.contribution}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Предодобренный лимит */}
      {result.preApproved && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--primary-tint)] px-3 py-2.5 flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[0.65rem] text-[var(--text-3)] font-semibold uppercase tracking-wide">
              Предодобрено
            </p>
            <p
              className="font-display font-extrabold text-lg leading-tight mt-0.5"
              style={{ color: "var(--primary)" }}
            >
              {fmtAmount(result.preApproved.limit_tg)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] text-[var(--text-3)] font-semibold uppercase tracking-wide">
              Ставка
            </p>
            <p className="text-base font-bold text-[var(--text)] mt-0.5">
              {String(result.preApproved.rate_pct).replace(".", ",")}% год.
            </p>
          </div>
        </div>
      )}

      {/* Дисклеймер */}
      <p className="text-[0.67rem] text-[var(--text-3)] leading-snug border-t border-[var(--border-soft)] pt-2 mt-1">
        Доступ к профилю &mdash; только с письменного согласия фермера (ЗРК &laquo;О персональных данных&raquo;).
        Данные синтетические.
      </p>
    </ContentCard>
  );
}
