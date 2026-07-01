'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listQuestions,
  resolveQuestion,
  SupportQuestion,
} from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import AppHeader from '@/components/AppHeader';
import Loader from '@/components/Loader';

// Человеческий ярлык источника обращения.
function scopeLabel(scope: string): string {
  if (!scope) return 'Сайт';
  if (scope === 'faq') return 'Общий FAQ';
  if (scope.startsWith('program-')) return `Программа: ${scope.slice('program-'.length)}`;
  return scope;
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'resolved', label: 'Решённые' },
];

function QuestionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') ?? '';

  const [items, setItems] = useState<SupportQuestion[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUid, setBusyUid] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listQuestions(statusFilter || undefined);
      setItems(res.questions ?? []);
      setCounts(res.by_status ?? {});
      setTotal(res.total ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterClick = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set('status', status);
    else params.delete('status');
    router.push(`/questions?${params.toString()}`);
  };

  const handleResolve = async (q: SupportQuestion) => {
    setBusyUid(q.uid);
    try {
      const next = q.status === 'resolved' ? 'new' : 'resolved';
      await resolveQuestion(q.uid, next);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить');
    } finally {
      setBusyUid('');
    }
  };

  const chipCount = (key: string): number => {
    if (key === '') return total;
    return counts[key] ?? 0;
  };

  if (!isAuthenticated()) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Обращения
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-3)' }}>
            Вопросы из блока «Не нашли ответ?» на сайте · Всего: {total}
          </p>
        </div>

        {/* Фильтр-чипы */}
        <div
          className="flex flex-wrap gap-2 mb-5 pb-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          {STATUS_FILTERS.map((chip) => {
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
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-tint)',
                    color: isActive ? 'var(--on-primary)' : 'var(--text-3)',
                  }}
                >
                  {chipCount(chip.key)}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div
            className="flex items-start gap-2 p-4 rounded-[var(--radius-lg)] mb-4 text-sm"
            style={{
              backgroundColor: 'var(--danger-soft)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
            }}
          >
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

        {loading && <Loader text="Загрузка обращений..." />}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>
            <p className="text-sm">Обращений не найдено</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((q) => {
              const resolved = q.status === 'resolved';
              return (
                <div key={q.uid} className="card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--bg-tint)', color: 'var(--text-2)' }}
                      >
                        {scopeLabel(q.scope)}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: resolved ? 'var(--success-soft, #e6f4ec)' : 'var(--primary-tint)',
                          color: resolved ? 'var(--success, #1a7a45)' : 'var(--primary)',
                        }}
                      >
                        {resolved ? 'Решено' : 'Новое'}
                      </span>
                      {q.locale && (
                        <span style={{ color: 'var(--text-3)' }}>{q.locale}</span>
                      )}
                      <span style={{ color: 'var(--text-3)' }}>{formatDate(q.created_at)}</span>
                    </div>
                    <button
                      onClick={() => handleResolve(q)}
                      disabled={busyUid === q.uid}
                      className="text-xs font-medium px-3 py-1.5 rounded-[var(--radius)] flex-shrink-0 transition-colors disabled:opacity-50"
                      style={{
                        border: '1px solid var(--border)',
                        color: resolved ? 'var(--text-2)' : 'var(--primary)',
                        backgroundColor: 'var(--surface)',
                      }}
                    >
                      {resolved ? 'Вернуть в новые' : 'Пометить решённым'}
                    </button>
                  </div>

                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text)' }}
                  >
                    {q.question}
                  </p>

                  {q.contact && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-2)' }}>
                      Контакт для ответа:{' '}
                      <span className="font-medium" style={{ color: 'var(--text)' }}>
                        {q.contact}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<Loader fullScreen text="Загрузка..." />}>
      <QuestionsContent />
    </Suspense>
  );
}
