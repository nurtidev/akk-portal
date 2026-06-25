'use client';

// =====================================================
// FunnelDeepLink — вход в воронку с внешних страниц (раздел «Продукты»).
// Читает query-параметры главной:
//   ?apply=<programId>  → applyDirect(id) — прямая подача по программе;
//   ?consult=1          → requestConsultation() — лёгкая форма консультации;
//   ?quiz=1             → startQuiz() — запуск подбора.
// После срабатывания параметр вычищается из URL (replaceState), чтобы рефреш
// не запускал воронку повторно. window.location вместо useSearchParams —
// чтобы не требовать Suspense-границы на статически рендеримой главной.
// =====================================================

import { useEffect } from 'react';
import { useFunnel } from './funnel-context';

export function FunnelDeepLink() {
  const { applyDirect, requestConsultation, startQuiz } = useFunnel();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const apply = params.get('apply');
    const consult = params.get('consult');
    const quiz = params.get('quiz');
    if (!apply && !consult && !quiz) return;

    // Убираем параметр из URL (оставляем path + hash).
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);

    if (apply) {
      applyDirect(apply); // неизвестный id — no-op (guard внутри)
    } else if (consult) {
      requestConsultation();
    } else if (quiz) {
      startQuiz();
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [applyDirect, requestConsultation, startQuiz]);

  return null;
}
