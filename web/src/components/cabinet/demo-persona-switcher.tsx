"use client";

// =====================================================
// ===== G16: переключатель демо-персон ================
// Плавающая панель (снизу справа) для смены персоны
// на презентации. Только в dev или при NEXT_PUBLIC_DEMO_PERSONAS=true
// или при наличии akk-demo-mode=1 в localStorage.
// =====================================================

import { useEffect, useState } from "react";
import { DEMO_IINS } from "@/data/agroscore-personas";

const PERSONA_LABELS = ["Айбек (A)", "Гүлнар (C)", "Марат (D)"];
const PERSONA_DOTS = ["#1F9D55", "#C9A21C", "#C0392B"];

export function DemoPersonaSwitcher() {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Определяем, показывать ли переключатель
    const isDev = process.env.NODE_ENV === "development";
    const envFlag = process.env.NEXT_PUBLIC_DEMO_PERSONAS === "true";
    let lsFlag = false;
    try {
      lsFlag = localStorage.getItem("akk-demo-mode") === "1";
    } catch {
      // localStorage недоступен (SSR / приватный режим)
    }
    setVisible(isDev || envFlag || lsFlag);

    // Текущая выбранная персона
    try {
      const stored = localStorage.getItem("akk-demo-persona");
      if (stored) setSelected(stored);
    } catch {
      // noop
    }
  }, []);

  if (!visible) return null;

  function selectPersona(iin: string) {
    try {
      localStorage.setItem("akk-demo-persona", iin);
    } catch {
      // noop
    }
    setSelected(iin);
    window.location.reload();
  }

  // Свёрнутый вид: компактный чип, ничего не перекрывает.
  if (!open) {
    const activeIdx = selected ? DEMO_IINS.indexOf(selected) : -1;
    const label = activeIdx >= 0 ? PERSONA_LABELS[activeIdx] : "Демо";
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)]/95 px-3 py-1.5 text-xs font-medium text-[var(--text-2)] shadow-lg backdrop-blur-sm hover:text-[var(--text)]"
      >
        {activeIdx >= 0 && (
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: PERSONA_DOTS[activeIdx] }}
          />
        )}
        {label}
      </button>
    );
  }

  // Развёрнутый вид: панель выбора персоны.
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex max-h-[80vh] flex-col gap-2 overflow-auto rounded-[var(--radius)] border border-[var(--border-soft)] bg-[var(--surface)]/95 px-4 py-3 shadow-lg backdrop-blur-sm"
      style={{ minWidth: 180 }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
          Демо: персона
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Свернуть"
          className="text-sm leading-none text-[var(--text-3)] hover:text-[var(--text)]"
        >
          ✕
        </button>
      </div>
      {DEMO_IINS.map((iin, i) => {
        const isActive = selected === iin;
        return (
          <button
            key={iin}
            type="button"
            onClick={() => selectPersona(iin)}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-xs font-medium transition-colors ${
              isActive
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--text-2)] hover:bg-[var(--bg-tint)] hover:text-[var(--text)]"
            }`}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: PERSONA_DOTS[i] }}
            />
            {PERSONA_LABELS[i]}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.removeItem("akk-demo-persona");
          } catch {
            // noop
          }
          setSelected(null);
          window.location.reload();
        }}
        className="mt-1 text-[10px] text-[var(--text-3)] underline underline-offset-2 hover:text-[var(--text)]"
      >
        сбросить
      </button>
    </div>
  );
}
