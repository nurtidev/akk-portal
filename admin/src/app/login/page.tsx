'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loginApi } from '@/lib/api';
import { setToken, getToken } from '@/lib/auth';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Если уже авторизован — перенаправляем
  useEffect(() => {
    if (getToken()) {
      router.replace('/applications');
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(username, password);
      setToken(data.accessToken, data.name);
      router.replace('/applications');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ошибка авторизации');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="w-full max-w-md">
        {/* Логотип / заголовок */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 7v10c0 5.25 3.75 10.15 9 11.25C17.25 17.15 21 12.25 21 7V7L12 2z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--text)' }}
          >
            АКК · Админ-панель
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-3)' }}>
            Войдите, чтобы продолжить
          </p>
        </div>

        {/* Форма */}
        <div
          className="card p-8"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-5">
              {/* Поле логина */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-2)' }}
                >
                  Логин
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] text-sm outline-none transition-all"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Поле пароля */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-2)' }}
                >
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-[var(--radius)] text-sm outline-none transition-all"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

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

              {/* Кнопка входа */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="btn-primary w-full justify-center py-3"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="31.4"
                        strokeDashoffset="10"
                      />
                    </svg>
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </button>
            </div>
          </form>

          {/* Подсказка */}
          <div
            className="mt-6 p-3 rounded-[var(--radius)] text-xs"
            style={{
              backgroundColor: 'var(--primary-tint)',
              color: 'var(--text-3)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <span className="font-medium" style={{ color: 'var(--text-2)' }}>
              Демо-доступ:
            </span>{' '}
            admin / akk-admin-2026
          </div>
        </div>
      </div>
    </div>
  );
}
