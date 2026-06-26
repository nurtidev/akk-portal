'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getApplication, AppDetail } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatTenge, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import AppHeader from '@/components/AppHeader';
import ActionPanel from '@/components/ActionPanel';
import Loader from '@/components/Loader';

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [app, setApp] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Защита: если не авторизован — на /login
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const loadApp = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError('');
    try {
      const data = await getApplication(uid);
      setApp(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  const handleUpdate = (updated: AppDetail) => {
    setApp(updated);
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader showBack />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Загрузка */}
        {loading && <Loader text="Загрузка заявки..." />}

        {/* Ошибка */}
        {!loading && error && (
          <div
            className="flex items-start gap-2 p-4 rounded-[var(--radius-lg)] text-sm"
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
              onClick={loadApp}
              className="ml-auto text-xs underline flex-shrink-0"
              style={{ color: 'var(--danger)' }}
            >
              Повторить
            </button>
          </div>
        )}

        {/* Содержимое карточки */}
        {!loading && app && (
          <div className="space-y-5">
            {/* ─── Заголовок заявки ─── */}
            <div
              className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                    Заявка {app.number}
                  </h1>
                  <StatusBadge status={app.status} label={app.status_label} />
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
                  Создана {formatDate(app.created_at)}
                </p>
              </div>
            </div>

            {/* ─── Комментарий администратора ─── */}
            {app.admin_comment && (
              <div
                className="flex gap-3 p-4 rounded-[var(--radius-lg)]"
                style={{
                  backgroundColor: 'var(--warning-soft)',
                  border: '1px solid var(--warning)',
                }}
              >
                <svg
                  className="flex-shrink-0 mt-0.5"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--warning)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--warning)' }}>
                    Комментарий администратора
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>
                    {app.admin_comment}
                  </p>
                </div>
              </div>
            )}

            {/* ─── Блок «Заёмщик» ─── */}
            <section className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Заёмщик
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    ФИО
                  </dt>
                  <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {app.client_name || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Телефон
                  </dt>
                  <dd className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
                    {app.client_phone || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    ИИН
                  </dt>
                  <dd className="mt-1 text-sm font-mono" style={{ color: 'var(--text)' }}>
                    {app.client_iin || '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* ─── Блок «Параметры заявки» ─── */}
            <section className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Параметры заявки
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Программа
                  </dt>
                  <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {app.program_title || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Цель кредита
                  </dt>
                  <dd className="mt-1 text-sm" style={{ color: 'var(--text)' }}>
                    {app.purpose || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Сумма
                  </dt>
                  <dd
                    className="mt-1 text-base font-semibold tabular-nums"
                    style={{ color: 'var(--primary)' }}
                  >
                    {app.amount ? formatTenge(app.amount) : '—'}
                  </dd>
                </div>
              </dl>
            </section>

            {/* ─── Блок «Документы» ─── */}
            <section className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Документы
              </h2>

              {app.documents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  Документы отсутствуют
                </p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
                  {app.documents.map((doc) => (
                    <li
                      key={doc.requirement_key}
                      className="py-3 flex items-start gap-3 first:pt-0 last:pb-0"
                    >
                      {/* Иконка статуса документа */}
                      <div className="mt-0.5 flex-shrink-0">
                        {doc.status === 'uploaded' || doc.status === 'approved' ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--success)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--text-3)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                            {doc.title}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                doc.status === 'uploaded' || doc.status === 'approved'
                                  ? 'var(--success-soft)'
                                  : 'var(--bg-tint)',
                              color:
                                doc.status === 'uploaded' || doc.status === 'approved'
                                  ? 'var(--success)'
                                  : 'var(--text-3)',
                            }}
                          >
                            {doc.status}
                          </span>
                        </div>

                        {doc.file_name && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                            {doc.file_name}
                            {doc.uploaded_at && (
                              <span className="ml-2">{formatDate(doc.uploaded_at)}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ─── Блок «Анкета (onboarding)» ─── */}
            <section className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Анкета (onboarding)
              </h2>

              {!app.onboarding ||
              (typeof app.onboarding === 'object' &&
                app.onboarding !== null &&
                Object.keys(app.onboarding).length === 0) ? (
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  нет данных
                </p>
              ) : (
                <pre
                  className="text-xs overflow-x-auto p-3 rounded-[var(--radius)]"
                  style={{
                    backgroundColor: 'var(--bg-tint)',
                    color: 'var(--text-2)',
                    border: '1px solid var(--border-soft)',
                    fontFamily:
                      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(app.onboarding, null, 2)}
                </pre>
              )}
            </section>

            {/* ─── Панель действий ─── */}
            <section className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: 'var(--text-3)' }}
              >
                Действия
              </h2>
              <ActionPanel app={app} onUpdate={handleUpdate} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
