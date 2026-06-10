"use client";

import { useState } from "react";

interface FormLabels {
  nameLabel: string;
  contactLabel: string;
  messageLabel: string;
  submitLabel: string;
  successMessage: string;
  namePlaceholder: string;
  contactPlaceholder: string;
  messagePlaceholder: string;
}

interface BlogQuestionFormProps {
  labels: FormLabels;
}

/**
 * BlogQuestionForm — клиентская форма «Задать вопрос председателю» (C12).
 * Отправка — мок (показывает «Спасибо» + console.log).
 * TODO: подключить бэкенд-эндпоинт /api/blog/question
 */
export function BlogQuestionForm({ labels }: BlogQuestionFormProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) return;

    setLoading(true);

    // TODO: бэкенд-эндпоинт POST /api/blog/question
    // fetch('/api/blog/question', { method: 'POST', body: JSON.stringify({ name, contact, message }) })
    console.log("[blog-question] mock submit:", { name, contact, message });

    // Симулируем задержку сети
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <p className="font-semibold text-[var(--text)]">
          {labels.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Имя */}
      <div>
        <label
          htmlFor="blog-name"
          className="block text-sm font-medium text-[var(--text)] mb-1.5"
        >
          {labels.nameLabel}
          <span className="ml-1 text-[var(--danger)]" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="blog-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
        />
      </div>

      {/* Контакт */}
      <div>
        <label
          htmlFor="blog-contact"
          className="block text-sm font-medium text-[var(--text)] mb-1.5"
        >
          {labels.contactLabel}
          <span className="ml-1 text-[var(--danger)]" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="blog-contact"
          type="text"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={labels.contactPlaceholder}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
        />
      </div>

      {/* Сообщение */}
      <div>
        <label
          htmlFor="blog-message"
          className="block text-sm font-medium text-[var(--text)] mb-1.5"
        >
          {labels.messageLabel}
          <span className="ml-1 text-[var(--danger)]" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id="blog-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={labels.messagePlaceholder}
          className="w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim() || !contact.trim() || !message.trim()}
        className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-dark,#065530)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="animate-spin"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
        {labels.submitLabel}
      </button>
    </form>
  );
}
