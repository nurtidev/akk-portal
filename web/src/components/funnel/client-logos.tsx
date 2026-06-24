'use client';

// =====================================================
// ===== ClientLogos — стена логотипов клиентов ========
// Чистая сетка логотипов (без текстовых подписей). Показываем
// только клиентов, для которых есть файл лого в public/img/clients/.
// Лого — грейскейл, при наведении проявляется цвет.
// alt = название (доступность). Если файл не загрузился —
// тихий фоллбэк на монограмму, чтобы сетка не «прыгала».
// =====================================================

import { useEffect, useRef, useState } from 'react';

interface Client {
  slug: string;
  name: string;
  initials: string;
  /** Файл лого в public/img/clients/ (с расширением). */
  logo: string;
}

const CLIENTS: Client[] = [
  { slug: 'kazbif',  name: 'Казбиф', initials: 'КБ', logo: 'kazbeef.svg' },
  { slug: 'natizhe', name: 'Натиже', initials: 'Н',  logo: 'natige.png' },
  { slug: 'pioneer', name: 'Пионер', initials: 'П',  logo: 'pioneer.jpg' },
  { slug: 'rodina',  name: 'Родина', initials: 'Р',  logo: 'rodina.png' },
  { slug: 'jfood',   name: 'Jfood',  initials: 'J',  logo: 'jfood.svg' },
  { slug: 'kazger',  name: 'Казгер', initials: 'КГ', logo: 'kazger.svg' },
];

// Один тайл клиента — только лого, без подписи.
function ClientLogo({ client }: { client: Client }) {
  const [imgOk, setImgOk] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // onError может сработать до гидратации (SSR) — проверяем
  // naturalWidth уже после монтирования, как в hero.tsx
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setImgOk(false);
  }, []);

  return (
    <div className="group flex min-h-[88px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-sm)] transition duration-300 hover:border-[var(--primary)] hover:shadow-md">
      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={`/img/clients/${client.logo}`}
          alt={client.name}
          className="max-h-12 w-auto max-w-full object-contain opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
          onError={() => setImgOk(false)}
        />
      ) : (
        // Фоллбэк — монограмма, если файл лого не загрузился
        <span
          aria-label={client.name}
          className="grid h-12 w-12 place-items-center rounded-full bg-[var(--primary-soft)] font-display text-lg font-bold text-[var(--primary)]"
        >
          {client.initials}
        </span>
      )}
    </div>
  );
}

export function ClientLogos() {
  return (
    <div className="mx-auto mt-6 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-6">
      {CLIENTS.map((client) => (
        <ClientLogo key={client.slug} client={client} />
      ))}
    </div>
  );
}
