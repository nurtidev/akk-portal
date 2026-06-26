'use client';

import { useState } from 'react';
import { AppDetail, decide } from '@/lib/api';

interface ActionPanelProps {
  app: AppDetail;
  onUpdate: (updated: AppDetail) => void;
}

type ActiveAction = null | 'rework' | 'reject';

export default function ActionPanel({ app, onUpdate }: ActionPanelProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Если заявка в конечном состоянии — панель действий не показываем
  if (app.is_terminal) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)]"
        style={{
          backgroundColor: 'var(--bg-tint)',
          border: '1px solid var(--border)',
          color: 'var(--text-2)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 8 12 12 14 14" />
        </svg>
        <span className="text-sm">
          Заявка в конечном состоянии:{' '}
          <strong>{app.status_label}</strong>
        </span>
      </div>
    );
  }

  const handleAdvance = async () => {
    setLoading(true);
    setError('');
    try {
      const updated = await decide(app.uid, { action: 'advance' });
      onUpdate(updated);
      setActiveAction(null);
      setComment('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при выполнении действия');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!activeAction) return;
    if (!comment.trim()) return;

    setLoading(true);
    setError('');
    try {
      const updated = await decide(app.uid, {
        action: activeAction,
        comment: comment.trim(),
      });
      onUpdate(updated);
      setActiveAction(null);
      setComment('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при выполнении действия');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setActiveAction(null);
    setComment('');
    setError('');
  };

  return (
    <div className="space-y-4">
      {/* Ошибка */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-[var(--radius)] text-sm"
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
        </div>
      )}

      {/* Кнопки действий (показываем, когда нет активного действия) */}
      {!activeAction && (
        <div className="flex flex-wrap gap-3">
          {/* Продвинуть дальше */}
          <button
            className="btn-primary"
            onClick={handleAdvance}
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            Дальше → {app.next_label ?? ''}
          </button>

          {/* На доработку */}
          <button
            className="btn-warning"
            onClick={() => {
              setActiveAction('rework');
              setError('');
            }}
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
            </svg>
            На доработку
          </button>

          {/* Отклонить */}
          <button
            className="btn-danger"
            onClick={() => {
              setActiveAction('reject');
              setError('');
            }}
            disabled={loading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Отклонить
          </button>
        </div>
      )}

      {/* Inline-форма для rework / reject */}
      {activeAction && (
        <div
          className="p-4 rounded-[var(--radius-lg)] space-y-3"
          style={{
            backgroundColor: activeAction === 'reject' ? 'var(--danger-soft)' : 'var(--warning-soft)',
            border: `1px solid ${activeAction === 'reject' ? 'var(--danger)' : 'var(--warning)'}`,
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: activeAction === 'reject' ? 'var(--danger)' : 'var(--warning)' }}
          >
            {activeAction === 'reject'
              ? 'Отклонение заявки — укажите причину:'
              : 'Отправка на доработку — укажите комментарий:'}
          </p>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Обязательный комментарий..."
            className="w-full px-3 py-2 text-sm rounded-[var(--radius)] outline-none resize-none"
            style={{
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor =
                activeAction === 'reject' ? 'var(--danger)' : 'var(--warning)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          />

          <div className="flex gap-2">
            {/* Подтвердить */}
            <button
              onClick={handleConfirm}
              disabled={loading || !comment.trim()}
              className={activeAction === 'reject' ? 'btn-danger' : 'btn-warning'}
            >
              {loading ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
              ) : null}
              {activeAction === 'reject' ? 'Подтвердить отклонение' : 'Отправить на доработку'}
            </button>

            {/* Отмена */}
            <button
              onClick={handleCancel}
              disabled={loading}
              className="btn-secondary"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
