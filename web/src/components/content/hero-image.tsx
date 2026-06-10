"use client";

import { useEffect, useRef } from "react";

/** SSR-надёжный фолбэк: onError может сработать до гидратации и потеряться —
    дополнительно проверяем naturalWidth после монтирования. */
function useBrokenImageFallback(hide: (el: HTMLImageElement) => void) {
  const ref = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.complete && el.naturalWidth === 0) hide(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/**
 * HeroImage — фоновое изображение шапки контентной страницы.
 * Клиентский компонент: onError нельзя передавать из серверного компонента
 * (RSC не сериализует обработчики). Если файла нет — картинка скрывается,
 * остаётся градиент-фолбэк из ContentPage.
 */
/** Универсальная картинка с фолбэком: если файла нет — скрывается (для серверных страниц). */
export function FallbackImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useBrokenImageFallback((el) => { el.style.display = "none"; });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function HeroImage({
  slug,
  position = "object-center",
}: {
  slug: string;
  /** Tailwind-класс object-position: какую часть кадра показывать в узкой шапке
      (например object-top — когда смысловой центр картинки сверху). */
  position?: string;
}) {
  const ref = useBrokenImageFallback((el) => { el.style.display = "none"; });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={`/img/content/${slug}.jpg`}
      alt=""
      aria-hidden="true"
      className={`content-hero-img absolute inset-0 h-full w-full object-cover ${position}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
