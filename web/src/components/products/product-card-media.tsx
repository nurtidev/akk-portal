'use client';

// =====================================================
// ProductCardMedia — медиа-шапка карточки на странице /products.
// Как в сетке воронки: при наведении на область фото проигрывается
// /img/programs/{id}.mp4 (зациклен, без звука), при уходе — сброс на фото.
// Видео опционально: если файла нет, ProgramPhoto сам остаётся на фото
// (а если и фото нет — под ним зелёный градиент карточки).
// =====================================================

import { useState } from 'react';
import { ProgramPhoto } from '@/components/funnel/program-media';

export function ProductCardMedia({ id, category }: { id: string; category: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      // z-10: медиа над «растянутой ссылкой» карточки (before:absolute inset-0),
      // иначе оверлей перехватывает наведение и видео не запускается. Заголовок
      // и остальная карточка остаются кликабельными (ссылка на детальную).
      className="relative z-10 -mx-5 -mt-5 mb-4 aspect-[16/9] overflow-hidden bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <ProgramPhoto id={id} playing={hover} lazy />
      <span className="absolute bottom-2 left-2 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        {category}
      </span>
    </div>
  );
}
