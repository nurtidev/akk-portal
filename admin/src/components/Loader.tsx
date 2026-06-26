'use client';

interface LoaderProps {
  /** Текст под спиннером */
  text?: string;
  /** Занять всю высоту экрана */
  fullScreen?: boolean;
}

export default function Loader({ text, fullScreen = false }: LoaderProps) {
  const wrapperClass = fullScreen
    ? 'min-h-screen flex flex-col items-center justify-center gap-4'
    : 'flex flex-col items-center justify-center gap-3 py-16';

  return (
    <div className={wrapperClass}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        className="animate-spin"
        style={{ color: 'var(--primary)' }}
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          stroke="var(--primary-soft)"
          strokeWidth="3"
        />
        <path
          d="M33 18 A15 15 0 0 0 18 3"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {text && (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          {text}
        </p>
      )}
    </div>
  );
}
