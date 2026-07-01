'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearToken, getName } from '@/lib/auth';

interface AppHeaderProps {
  /** Показывать ли кнопку «← К списку» */
  showBack?: boolean;
}

export default function AppHeader({ showBack = false }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const name = getName();

  const navItems = [
    { href: '/applications', label: 'Заявки' },
    { href: '/questions', label: 'Обращения' },
  ];

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        style={{ height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}
      >
        {/* Логотип / название */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v10c0 5.25 3.75 10.15 9 11.25C17.25 17.15 21 12.25 21 7V7L12 2z" />
            </svg>
          </div>
          <span
            className="font-semibold text-sm hidden sm:block"
            style={{ color: 'var(--text)' }}
          >
            АКК Админ
          </span>
        </div>

        {/* Кнопка «К списку» */}
        {showBack && (
          <Link
            href="/applications"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--text-2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            К списку
          </Link>
        )}

        {/* Навигация */}
        {!showBack && (
          <nav className="flex items-center gap-1 ml-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-[var(--radius)] text-sm font-medium transition-colors"
                  style={{
                    color: active ? 'var(--primary)' : 'var(--text-2)',
                    backgroundColor: active ? 'var(--primary-tint)' : 'transparent',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Пользователь + выход */}
        <div className="flex items-center gap-3">
          {name && (
            <span className="text-sm hidden sm:block" style={{ color: 'var(--text-3)' }}>
              {name}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="btn-secondary text-sm py-1.5 px-3"
            title="Выйти"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>
    </header>
  );
}
