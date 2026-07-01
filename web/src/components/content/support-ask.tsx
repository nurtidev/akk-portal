"use client";

import { useState } from "react";
import { askSupport } from "@/lib/api/faq";

export interface SupportAskLabels {
  notFoundTitle: string;
  notFoundLede: string;
  askCta: string;
  questionLabel: string;
  questionPlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  send: string;
  sent: string;
  error: string;
  cancel: string;
}

/**
 * SupportAsk — блок «Не нашли ответ? Задать вопрос». Раскрывает форму
 * (вопрос + контакт для ответа) и отправляет обращение на бэкенд
 * (POST /api/v1/faq/question) — оно попадает в админку поддержки.
 */
export function SupportAsk({
  scope,
  locale,
  labels,
}: {
  scope: string;
  locale: string;
  labels: SupportAskLabels;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || state === "sending") return;
    setState("sending");
    const ok = await askSupport({
      question: question.trim(),
      contact: contact.trim(),
      scope,
      locale,
    });
    setState(ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--primary-soft)] bg-[var(--primary-soft)] p-5">
        <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <p className="text-sm font-medium leading-relaxed text-[var(--primary)]">{labels.sent}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-warm)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--text)]">{labels.notFoundTitle}</p>
          <p className="mt-1 text-sm text-[var(--text-2)]">{labels.notFoundLede}</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 flex-shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {labels.askCta}
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="support-question" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              {labels.questionLabel}
              <span className="ml-1 text-[var(--danger)]" aria-hidden="true">*</span>
            </label>
            <textarea
              id="support-question"
              required
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={labels.questionPlaceholder}
              className="w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label htmlFor="support-contact" className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              {labels.contactLabel}
            </label>
            <input
              id="support-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={labels.contactPlaceholder}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>

          {state === "error" && (
            <p className="text-sm font-medium text-[var(--danger)]">{labels.error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={state === "sending" || !question.trim()}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === "sending" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {labels.send}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-2)] transition hover:bg-[var(--bg-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {labels.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
