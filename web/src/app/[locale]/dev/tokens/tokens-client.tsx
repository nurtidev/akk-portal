"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/hooks/use-theme";

const PALETTE_TOKENS = [
  { name: "--bg", label: "bg", desc: "Фон страницы" },
  { name: "--bg-tint", label: "bg-tint", desc: "Акцентный фон" },
  { name: "--surface", label: "surface", desc: "Поверхность карточек" },
  { name: "--surface-warm", label: "surface-warm", desc: "Тёплая поверхность" },
  { name: "--primary", label: "primary", desc: "Зелёный-primary (#07663D)" },
  { name: "--primary-2", label: "primary-2", desc: "Зелёный hover" },
  { name: "--primary-soft", label: "primary-soft", desc: "Мягкий зелёный" },
  { name: "--accent", label: "accent", desc: "Золото-deep (#C9A21C)" },
  { name: "--accent-2", label: "accent-2", desc: "Золото-текст (AA)" },
  { name: "--accent-soft", label: "accent-soft", desc: "Мягкое золото" },
  { name: "--gold", label: "gold", desc: "Мягкий золотой (#D3B961)" },
  { name: "--text", label: "text", desc: "Основной текст" },
  { name: "--text-2", label: "text-2", desc: "Вторичный текст" },
  { name: "--text-3", label: "text-3", desc: "Третичный текст" },
  { name: "--border", label: "border", desc: "Основной бордер" },
  { name: "--border-soft", label: "border-soft", desc: "Мягкий бордер" },
  { name: "--success", label: "success", desc: "Успех" },
  { name: "--warning", label: "warning", desc: "Предупреждение" },
  { name: "--danger", label: "danger", desc: "Ошибка" },
] as const;

export function TokensPageClient() {
  const t = useTranslations("tokens");
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-12">
      {/* Переключатель темы */}
      <section>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-[var(--text-2)]">
            {t("themeLabel")}:
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
          >
            {theme === "dark" ? (
              <>
                <span>☀️</span> {t("lightTheme")}
              </>
            ) : (
              <>
                <span>🌙</span> {t("darkTheme")}
              </>
            )}
          </button>
          <span className="text-xs text-[var(--text-3)]">
            (сохраняется в localStorage: <code className="font-mono">akk-theme</code>)
          </span>
        </div>
      </section>

      {/* Палитра */}
      <section>
        <h2 className="font-display text-xl font-semibold text-[var(--text)] mb-4">
          {t("paletteTitle")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {PALETTE_TOKENS.map((token) => (
            <div
              key={token.name}
              className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-sm)]"
            >
              {/* Цветной прямоугольник */}
              <div
                className="h-14"
                style={{ background: `var(${token.name})` }}
              />
              {/* Подпись */}
              <div className="p-2 bg-[var(--surface)]">
                <div className="font-mono text-xs font-semibold text-[var(--text)] truncate">
                  {token.label}
                </div>
                <div className="text-[11px] text-[var(--text-3)] truncate">
                  {token.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Типографика */}
      <section>
        <h2 className="font-display text-xl font-semibold text-[var(--text)] mb-6">
          {t("typographyTitle")}
        </h2>
        <div className="space-y-6 rounded-[var(--radius-lg)] border border-[var(--border)] p-6 bg-[var(--surface)]">
          {/* Montserrat Display */}
          <div>
            <div className="text-xs font-mono text-[var(--text-3)] mb-2">
              {t("displayFont")}
            </div>
            <div className="space-y-2">
              <div className="font-display text-4xl font-bold text-[var(--primary)]">
                Аграрная кредитная
              </div>
              <div className="font-display text-2xl font-semibold text-[var(--text)]">
                корпорация АКК
              </div>
              <div className="font-display text-lg font-medium text-[var(--text-2)]">
                Программы финансирования АПК
              </div>
            </div>
          </div>

          {/* Onest Body */}
          <div>
            <div className="text-xs font-mono text-[var(--text-3)] mb-2">
              {t("bodyFont")}
            </div>
            <div className="space-y-2">
              <div className="font-body text-base text-[var(--text)]">
                Финансовый институт развития сельского хозяйства Казахстана.
                Дочерняя организация НУХ «Байтерек». От посевной кампании до
                племенного животноводства.
              </div>
              <div className="font-body text-sm text-[var(--text-2)]">
                Ставки по субсидированным программам от 5%. Максимальная сумма
                15 млрд ₸. Срок до 84 месяцев.
              </div>
              <div className="font-body text-xs text-[var(--text-3)]">
                Параметры программ соответствуют положению П АКК 002-207-22.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Кнопки */}
      <section>
        <h2 className="font-display text-xl font-semibold text-[var(--text)] mb-4">
          {t("buttonsTitle")}
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Primary */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            {t("btnPrimary")}
          </button>

          {/* Secondary */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] border-2 border-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {t("btnSecondary")}
          </button>

          {/* Ghost */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {t("btnGhost")}
          </button>

          {/* Accent */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Акцентная кнопка
          </button>

          {/* Destructive */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--danger)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
          >
            {t("btnDestructive")}
          </button>
        </div>
      </section>

      {/* Тени и бордеры */}
      <section>
        <h2 className="font-display text-xl font-semibold text-[var(--text)] mb-4">
          Тени и радиусы
        </h2>
        <div className="flex flex-wrap gap-4">
          {[
            { label: "shadow-sm", shadow: "var(--shadow-sm)" },
            { label: "shadow", shadow: "var(--shadow)" },
            { label: "shadow-lg", shadow: "var(--shadow-lg)" },
          ].map(({ label, shadow }) => (
            <div
              key={label}
              className="flex items-center justify-center w-32 h-20 rounded-[var(--radius-lg)] bg-[var(--surface)] text-xs font-mono text-[var(--text-2)]"
              style={{ boxShadow: shadow }}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-4">
          {[
            { label: "radius-sm (6px)", r: "var(--radius-sm)" },
            { label: "radius (10px)", r: "var(--radius)" },
            { label: "radius-lg (16px)", r: "var(--radius-lg)" },
            { label: "radius-xl (24px)", r: "var(--radius-xl)" },
          ].map(({ label, r }) => (
            <div
              key={label}
              className="flex items-center justify-center w-32 h-14 border-2 border-[var(--primary)] bg-[var(--primary-soft)] text-xs font-mono text-[var(--primary)]"
              style={{ borderRadius: r }}
            >
              {label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
