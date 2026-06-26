'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { listApplications, getStats, AppListItem, Stats } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatTenge, formatDate, STATUS_LABELS, STATUS_ORDER } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import AppHeader from '@/components/AppHeader';
import Loader from '@/components/Loader';

// Внутренний компонент — использует useSearchParams (требует Suspense-обёртки)
function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';

  const [apps, setApps] = useState<AppListItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Защита: если не авторизован — на /login
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listResult, statsResult] = await Promise.all([
        listApplications(statusFilter || undefined),
        getStats(),
      ]);
      setApps(listResult.applications ?? []);
      setStats(statsResult);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterClick = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    router.push(`/applications?${params.toString()}`);
  };

  // Фильтр-чипы: «Все» + статусы с ненулевым количеством
  const filterChips: { key: string; label: string; count: number }[] = [
    { key: '', label: 'Все', count: stats?.total ?? 0 },
    ...STATUS_ORDER.filter((s) => (stats?.by_status[s] ?? 0) > 0).map((s) => ({
      key: s,
      label: STATUS_LABELS[s] ?? s,
      count: stats?.by_status[s] ?? 0,
    })),
  ];

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Заявки
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-3)' }}>
            {stats ? `Всего: ${stats.total}` : 'Загрузка...'}
          </p>
        </div>

        {/* Фильтр-чипы по статусам */}
        {stats && (
          <div
            className="flex flex-wrap gap-2 mb-5 pb-4"
            style={{ borderBottom: '1px solid var(--border-soft)' }}
          >
            {filterChips.map((chip) => {
              const isActive = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => handleFilterClick(chip.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                    color: isActive ? 'var(--on-primary)' : 'var(--text-2)',
                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                    boxShadow: isActive ? '0 2px 6px rgba(7,102,61,0.25)' : 'none',
                  }}
                >
                  {chip.label}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.2)'
                        : 'var(--bg-tint)',
                      color: isActive ? 'var(--on-primary)' : 'var(--text-3)',
                    }}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div
            className="flex items-start gap-2 p-4 rounded-[var(--radius-lg)] mb-4 text-sm"
            style={{
              backgroundColor: 'var(--danger-soft)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
            }}
          >
            <svg
              className="flex-shrink-0 mt-0.5"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
            <button
              onClick={loadData}
              className="ml-auto text-xs underline flex-shrink-0"
              style={{ color: 'var(--danger)' }}
            >
              Повторить
            </button>
          </div>
        )}

        {/* Загрузка */}
        {loading && <Loader text="Загрузка заявок..." />}

        {/* Пустой список */}
        {!loading && !error && apps.length === 0 && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--text-3)' }}
          >
            <svg
              className="mx-auto mb-3"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            <p className="text-sm">Заявок не найдено</p>
          </div>
        )}

        {/* Таблица (десктоп) */}
        {!loading && apps.length > 0 && (
          <>
            {/* Десктопная таблица */}
            <div className="hidden md:block card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-warm)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)', width: '120px' }}>
                      № заявки
                    </th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      ФИО клиента
                    </th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      Телефон
                    </th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      Программа
                    </th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      Сумма
                    </th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      Статус
                    </th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-3)' }}>
                      Дата
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, idx) => (
                    <tr
                      key={app.uid}
                      onClick={() => router.push(`/applications/${app.uid}`)}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderBottom:
                          idx < apps.length - 1
                            ? '1px solid var(--border-soft)'
                            : 'none',
                        backgroundColor: 'var(--surface)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          'var(--primary-tint)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          'var(--surface)';
                      }}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                        {app.number}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text)' }}>
                        {app.client_name}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                        {app.client_phone}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]" style={{ color: 'var(--text-2)' }}>
                        <span className="block truncate" title={app.program_title}>
                          {app.program_title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                        {formatTenge(app.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={app.status}
                          label={app.status_label}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--text-3)' }}>
                        {formatDate(app.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильные карточки */}
            <div className="md:hidden space-y-3">
              {apps.map((app) => (
                <div
                  key={app.uid}
                  onClick={() => router.push(`/applications/${app.uid}`)}
                  className="card p-4 cursor-pointer active:opacity-80 transition-opacity"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                        {app.client_name}
                      </div>
                      <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-3)' }}>
                        {app.number}
                      </div>
                    </div>
                    <StatusBadge status={app.status} label={app.status_label} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Телефон</div>
                      <div className="mt-0.5">{app.client_phone}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Дата</div>
                      <div className="mt-0.5">{formatDate(app.created_at)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Программа</div>
                      <div className="mt-0.5 truncate">{app.program_title}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Сумма</div>
                      <div className="mt-0.5 font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                        {formatTenge(app.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Экспортируемая страница — оборачивает контент в Suspense для useSearchParams
export default function ApplicationsPage() {
  return (
    <Suspense fallback={<Loader fullScreen text="Загрузка..." />}>
      <ApplicationsContent />
    </Suspense>
  );
}
