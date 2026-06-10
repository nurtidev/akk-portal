'use client';

// =====================================================
// ===== B7: Funnel — сборка секций + переключение экранов
// hero → programs → quiz → results → stress → wizard → success.
// Секции скрыты до своего шага (как showSection() в легаси): на landing видны
// hero+programs; на шаге воронки — соответствующая секция, лендинг скрыт.
// Переключение — через FunnelProvider (state.screen).
// =====================================================

import { useEffect, useRef } from 'react';
import { Hero } from './hero';
import { ProgramGrid } from './program-grid';
import { Quiz } from './quiz';
import { Results } from './results';
import { StressTest } from './stress-test';
import { ApplyWizard } from './apply-wizard';
import { Success } from './success';
import { useFunnel } from './funnel-context';

export function Funnel() {
  const { state, startQuiz } = useFunnel();
  const screen = state.screen;
  const isLanding = screen === 'landing';
  const flowRef = useRef<HTMLDivElement | null>(null);
  const prevScreen = useRef(screen);

  // «Подбор» в шапке ведёт на /{locale}#quiz — секции с таким id на лендинге нет
  // (квиз рендерится только после старта), поэтому запускаем подбор по якорю:
  // на маунте (переход с контентной страницы) и по hashchange (клик на главной).
  useEffect(() => {
    const maybeStart = () => {
      if (window.location.hash === '#quiz') startQuiz();
    };
    maybeStart();
    window.addEventListener('hashchange', maybeStart);
    return () => window.removeEventListener('hashchange', maybeStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // При смене экрана воронки — мягкий скролл к активной секции (как showSection).
  useEffect(() => {
    if (screen !== prevScreen.current && !isLanding) {
      const top = (flowRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    prevScreen.current = screen;
  }, [screen, isLanding]);

  return (
    <main id="main-content" className="flex-1">
      {/* Лендинг: hero + сетка программ — скрыты, когда воронка активна */}
      <div hidden={!isLanding}>
        <Hero />
        <ProgramGrid />
      </div>

      {/* Секции воронки */}
      {!isLanding && (
        <div id="quiz" ref={flowRef} className="container mx-auto px-4 py-12 md:py-16">
          {screen === 'quiz' && <Quiz />}
          {screen === 'results' && <Results />}
          {screen === 'stress' && <StressTest />}
          {screen === 'wizard' && <ApplyWizard />}
          {screen === 'success' && <Success />}
        </div>
      )}
    </main>
  );
}
