"use client";

import { useState } from "react";

/**
 * BankLogo — логотип банка-партнёра из /img/banks/{slug}.png.
 * Пока официальный файл не положен — кружок с первой буквой названия
 * (фирменные цвета банков не угадываем, используем токены АКК).
 * Логотипы НЕ генерировать: скачать официальные (см. docs/IMAGE_PROMPTS.md).
 */
export function BankLogo({ slug, name }: { slug: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] font-display text-base font-bold text-[var(--primary)]"
        aria-hidden="true"
      >
        {name.trim().charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/img/banks/${slug}.png`}
      alt={`Логотип ${name}`}
      loading="lazy"
      className="h-10 w-10 flex-shrink-0 rounded-full object-contain bg-white p-1 border border-[var(--border-soft)]"
      onError={() => setFailed(true)}
    />
  );
}
