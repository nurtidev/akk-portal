"use client";

import { useEffect, useState } from "react";
import { voteFaq, getFaqStats, getMyVote, type FaqStat } from "@/lib/api/faq";

export interface FaqFeedbackLabels {
  /** «Полезен ли ответ?» */
  prompt: string;
  /** «Да» */
  yes: string;
  /** «Нет» */
  no: string;
  /** «Спасибо за отзыв!» */
  thanks: string;
  /** Шаблон с {percent} и {total}, напр. «{percent}% из {total} нашли ответ полезным». */
  percentHelpful: string;
}

/**
 * FaqFeedback — оценка полезности ответа (как у Kaspi): 👍/👎 + агрегат
 * «N% из M нашли ответ полезным». Голос привязан к анонимному id устройства
 * (localStorage), считается на бэкенде. Клиентский островок внутри
 * server-rendered AccordionItem — сам ответ остаётся в HTML (SEO).
 */
export function FaqFeedback({
  itemKey,
  labels,
}: {
  itemKey: string;
  labels: FaqFeedbackLabels;
}) {
  const [stat, setStat] = useState<FaqStat | null>(null);
  const [myVote, setMyVote] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMyVote(getMyVote(itemKey));
    let alive = true;
    getFaqStats([itemKey]).then((m) => {
      if (alive && m[itemKey]) setStat(m[itemKey]);
    });
    return () => {
      alive = false;
    };
  }, [itemKey]);

  async function handleVote(helpful: boolean) {
    if (busy) return;
    setBusy(true);
    const prev = myVote;
    setMyVote(helpful); // оптимистично
    const fresh = await voteFaq(itemKey, helpful);
    if (fresh) {
      setStat(fresh);
    } else if (prev === null) {
      // бэк недоступен — оставляем локальную благодарность, но без цифр
      setStat(null);
    }
    setBusy(false);
  }

  const percentLine =
    stat && stat.total > 0
      ? labels.percentHelpful
          .replace("{percent}", String(stat.percent))
          .replace("{total}", String(stat.total))
      : null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-3)]">
      {myVote === null ? (
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{labels.prompt}</span>
          <button
            type="button"
            onClick={() => handleVote(true)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 font-medium text-[var(--text-2)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50"
            aria-label={labels.yes}
          >
            <ThumbUp />
            {labels.yes}
          </button>
          <button
            type="button"
            onClick={() => handleVote(false)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 font-medium text-[var(--text-2)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:opacity-50"
            aria-label={labels.no}
          >
            <ThumbDown />
            {labels.no}
          </button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--primary)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {labels.thanks}
        </span>
      )}

      {percentLine && <span className="text-[var(--text-3)]">{percentLine}</span>}
    </div>
  );
}

function ThumbUp() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  );
}
