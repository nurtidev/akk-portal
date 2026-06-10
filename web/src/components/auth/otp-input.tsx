"use client";

// =====================================================
// ===== D2: OTP-ввод (6 ячеек) ========================
// Автопереход между ячейками, backspace назад, вставка из буфера.
// Поведение перенесено из wireOtpCells (__auth-integration.js).
// =====================================================

import { useEffect, useRef } from "react";
import { onlyDigits } from "@/lib/api";

interface OtpInputProps {
  /** Текущее значение (строка до 6 цифр). */
  value: string;
  onChange: (code: string) => void;
  /** Автофокус на первой ячейке при монтировании. */
  autoFocus?: boolean;
  "aria-label"?: string;
}

const LEN = 6;

export function OtpInput({
  value,
  onChange,
  autoFocus = true,
  "aria-label": ariaLabel = "Код из SMS",
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const digits = value.padEnd(LEN, " ").slice(0, LEN).split("");

  function setAt(idx: number, ch: string) {
    const arr = value.padEnd(LEN, " ").slice(0, LEN).split("");
    arr[idx] = ch || " ";
    onChange(arr.join("").replace(/\s/g, ""));
  }

  return (
    <div
      className="flex justify-between gap-2 my-4"
      role="group"
      aria-label={ariaLabel}
    >
      {Array.from({ length: LEN }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Цифра ${idx + 1}`}
          value={digits[idx] === " " ? "" : digits[idx]}
          onChange={(e) => {
            const d = onlyDigits(e.target.value).slice(-1);
            setAt(idx, d);
            if (d && idx < LEN - 1) refs.current[idx + 1]?.focus();
          }}
          onKeyDown={(e) => {
            const empty = digits[idx] === " ";
            if (e.key === "Backspace" && empty && idx > 0) {
              refs.current[idx - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const t = onlyDigits(e.clipboardData.getData("text")).slice(0, LEN);
            onChange(t);
            refs.current[Math.min(t.length, LEN - 1)]?.focus();
          }}
          className="h-14 w-[46px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-center text-2xl font-semibold text-[var(--text)] focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
      ))}
    </div>
  );
}
