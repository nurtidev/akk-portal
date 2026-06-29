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
import { GoalCards } from './goal-cards';
import { ProgramShowcase } from './program-showcase';
import { HowSteps } from './how-steps';
import { ChairmanTeaser } from './chairman-teaser';
import { SustainabilityPromo } from './sustainability-promo';
import { ConstitutionBanner } from './constitution-banner';
import { SuccessStories } from './success-stories';
import { Quiz } from './quiz';
import { Results } from './results';
import { StressTest } from './stress-test';
import { ApplyWizard } from './apply-wizard';
import { ConsultationForm } from './consultation-form';
import { Success } from './success';
import { useFunnel } from './funnel-context';

export function Funnel() {
  const { state, startQuiz, setScreen, reset } = useFunnel();
  const screen = state.screen;
  const isLanding = screen === 'landing';
  const flowRef = useRef<HTMLDivElement | null>(null);
  const prevScreen = useRef(screen);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  // Якоря из шапки: «Подбор» (#quiz) запускает квиз; «Программы» (#programs)
  // с экранов воронки возвращают на лендинг и скроллят к сетке (раньше клик
  // «в никуда»: секция была скрыта, браузеру некуда скроллить).
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#quiz') startQuiz();
      if (h === '#programs' && screenRef.current !== 'landing') {
        setScreen('landing');
        // ждём ремоунт лендинга, затем скроллим к сетке программ
        setTimeout(() => {
          document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      }
    };
    onHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Клик по логотипу (или иной ссылке «на главную») когда мы УЖЕ на /{locale}:
  // роут не меняется, Next не перемонтирует страницу, поэтому экран воронки
  // (квиз/результаты/визард) «залипал». Шапка шлёт событие — сбрасываем воронку
  // в лендинг, чтобы логотип реально возвращал на главную из любого шага.
  useEffect(() => {
    const onGoHome = () => {
      if (screenRef.current !== 'landing') reset();
    };
    window.addEventListener('akk:go-home', onGoHome);
    return () => window.removeEventListener('akk:go-home', onGoHome);
  }, [reset]);

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
      {/* Лендинг: hero + сетка программ — скрыты, когда воронка активна.
          Порядок: полноэкранный hero первого вида (с финансовыми метриками
          под кнопками) → intent-selector (выбор цели → преднастроенная воронка)
          → далее. Метрики теперь внутри hero, отдельной полосы WhyAkk нет. */}
      <div hidden={!isLanding}>
        <Hero />
        {/* «Под разные цели АПК» — сразу после hero (главное действие выше). */}
        <ProgramShowcase />
        <GoalCards />
        <HowSteps />
        <ChairmanTeaser />
        <ConstitutionBanner />
        <SuccessStories />
        {/* «Устойчивое развитие» — после «Пресс-центра» (SuccessStories). */}
        <SustainabilityPromo />
      </div>

      {/* Секции воронки */}
      {!isLanding && (
        <div id="quiz" ref={flowRef} className="container mx-auto px-4 py-12 md:py-16">
          {screen === 'quiz' && <Quiz />}
          {screen === 'results' && <Results />}
          {screen === 'stress' && <StressTest />}
          {screen === 'callback' && <ConsultationForm />}
          {screen === 'wizard' && <ApplyWizard />}
          {screen === 'success' && <Success />}
        </div>
      )}
    </main>
  );
}
