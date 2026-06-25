'use client';

// =====================================================
// LoopVideo — зацикленный фоновый 3D-ролик (приём bankffin.kz/ipoteka:
// <video autoplay loop muted playsinline> с .webm/.mp4). Сам тег тривиален;
// 3D-анимацию рендерит дизайнер/нейросеть в файл. Пока файла нет — показываем
// `fallback` (постер/картинку), код менять не нужно.
// - autoPlay+muted+playsInline — автозапуск без звука работает на iOS/Android;
// - prefers-reduced-motion → видео ставится на паузу (доступность);
// - onError по <source>/видео → рендерим fallback.
// =====================================================

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function LoopVideo({
  webm,
  mp4,
  poster,
  className,
  fallback = null,
}: {
  webm: string;
  mp4?: string;
  poster?: string;
  className?: string;
  /** Что показать, если видео не загрузилось (нет файла) — напр. <img/>. */
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Доступность: при prefers-reduced-motion не крутим — остаётся постер.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.removeAttribute('autoplay');
      v.pause();
    }

    // Если ни один <source> не подгрузился — показываем fallback.
    if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) setFailed(true);
    const onErr = () => {
      if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) setFailed(true);
    };
    v.addEventListener('error', onErr);
    v.querySelectorAll('source').forEach((s) => s.addEventListener('error', onErr));
    return () => v.removeEventListener('error', onErr);
  }, []);

  if (failed) return <>{fallback}</>;

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden="true"
    >
      <source src={webm} type="video/webm" />
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  );
}
