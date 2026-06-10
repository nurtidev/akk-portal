# Статус разработки akk-portal

Правила: перед началом работы отметь задачу `in_progress` (+ дата, кто). По завершении — `done` + 1 строка итога. Если заблокирован — `blocked` + причина. Описания задач и критерии приёмки — в [PLAN.md](PLAN.md).

Статусы: `todo` · `in_progress` · `done` · `blocked`

## Трек F — Фундамент

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| F1 Скаффолд Next.js в web/ | done | sonnet-F | 2026-06-10 | Next 15.3.3 + React 19 + Tailwind 3.4 + vitest; build зелёный |
| F2 Дизайн-токены + тёмная тема | done | sonnet-F | 2026-06-10 | токены из index.html:21–96, Montserrat/Onest, ключ akk-theme, витрина /dev/tokens |
| F3 next-intl (kk/ru/en) | done | sonnet-F | 2026-06-10 | /ru /kk /en SSG, messages/*.json, переключатель в шапке |
| F4 Layout (Header/Footer) | done | sonnet-F | 2026-06-10 | шапка+футер по легаси, эмблема SVG, бургер ≤640px, skip-link |

## Трек A — Бизнес-логика

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| A1 data/programs.ts | done | opus-A | 2026-06-10 | PROGRAMS(7)+PROGRAM_DETAILS перенесены дословно + типы; golden-фикстура legacy.cjs |
| A2 data/questions.ts | done | opus-A | 2026-06-10 | QUESTIONS + условные вопросы + getQuestions(5/6/7 шагов) + optionLabel/questionShort; golden vs легаси |
| A3 data/fajr-norms.ts | done | opus-A | 2026-06-10 | FAJR_NORMS(4 вида) перенесены дословно; golden vs легаси |
| A4 lib/scoring.ts + тесты | done | opus-A | 2026-06-10 | scoreProgram/explainProgram/scoredPrograms; 7 сценариев + golden vs легаси |
| A5 lib/schedule.ts + тесты | done | opus-A | 2026-06-10 | calculateSchedule(2 схемы)/effectiveMaxTerm/pickInitialTerm; golden до тенге |
| A6 lib/stress.ts + тесты | done | opus-A | 2026-06-10 | calculateStress(Fajr-lite) пар-зован; вердикты <30/30–50/>50% + пастбища/помещения; golden vs легаси |
| A7 lib/format.ts | done | opus-A | 2026-06-10 | fmtAmount/declension дословно (golden); fmtRate как чистая структура (HTML вынесен в web-слой) |

## Трек B — Воронка UI (ждёт F4 + A)

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| B1 ProgramGrid + ProgramModal | done | opus-B | 2026-06-10 | сетка (featured-первым, indirect-бейдж, фото+иконка-фолбэк), Radix-модалка PROGRAM_DETAILS + CTA «Подать заявку» |
| B2 Quiz | done | opus-B | 2026-06-10 | единый FunnelProvider (context+reducer), прогресс 5/6/7, getQuestions, задержка 180мс, назад/переход по пройденным |
| B3 Results | done | opus-B | 2026-06-10 | карточки scoredPrograms, «Лучшее совпадение», раскрывашка «Почему N%» (explainProgram, «до +N»), пустое состояние |
| B4 Calculator | done | opus-B | 2026-06-10 | слайдер+ручной ввод (старт из ответа), кнопки сроков ≤ effectiveMaxTerm, график обеих схем, событие calculator_amount/term |
| B5 StressTest | done | opus-B | 2026-06-10 | форма Fajr-lite + вердикт-пилюля ok/warn/bad + метрики; только hasStressTest; «Пропустить»; расчёт из @/lib/stress |
| B6 ApplyWizard + Success | done | opus-B | 2026-06-10 | визард Параметры→Заявитель→Согласия→SMS→Готово; submit через submitApplication (мок, TODO трек D); экран успеха с номером |
| B7 Главная (Hero + сборка) | done | opus-B | 2026-06-10 | Hero (эмблема/статы/CTA) + сборка hero→programs→quiz→results→stress→wizard→success через FunnelProvider; analytics.ts track() по таблице README |

## Трек C — Контент (ждёт F3/F4)

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| C1 Шаблон контентной страницы | done | sonnet-C | 2026-06-10 | ContentPage/ContentSection/AccordionItem/DocumentList/CardGrid — SSG, breadcrumbs, prose, нет хардкода строк |
| C2 О компании / управление | done | sonnet-C | 2026-06-10 | /about: миссия+стратегия, СД/правление/ДО, корп.управление, комплаенс (+7 775 007 27 01), омбудсмен |
| C3 Отчётность / инвесторам | done | sonnet-C | 2026-06-10 | /reporting (финотч 4 года + годовые); /investors (3 рейтинга-карточки + KASE + раскрытие) |
| C4 Пресс-центр | done | sonnet-C | 2026-06-10 | /press (4 новости + 2 СМИ + 2 истории); /press/[slug] SSG generateStaticParams; press-data.ts 8 записей |
| C5 FAQ | done | sonnet-C | 2026-06-10 | /faq: 10 реальных Q&A по кредитованию АКК; нативный details/summary аккордеон; CTA колл-центра |
| C6 Контакты / филиалы | done | sonnet-C | 2026-06-10 | /contacts: ЦА (1408/email/hotline), 16 филиалов-карточек по областям, блок КТ; адреса — TODO (WebFetch недоступен) |
| C7 Страхование/залоги/закупки/вакансии | done | sonnet-C | 2026-06-10 | /insurance /collateral /procurement /careers — каждая: заголовок+описание+3 секции+внешние ссылки |

## Трек D — Auth + кабинет (ждёт F4)

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| D1 API-клиент к Go-бэку | done | opus-D | 2026-06-10 | lib/api: config(NEXT_PUBLIC_API_BASE, demo-fallback unavailable)/http/tokens(JWT-claims, akk-tokens)/auth/credit/status(APP_STAGES+STATUS_INDEX)/text; submitApplication + funnelSubmitAdapter для трека B; README с контрактом |
| D2 SMS-auth UI | done | opus-D | 2026-06-10 | AuthProvider(context, восстановление сессии через me()), AuthModal (логин ИИН→OTP, регистрация ФИО+ИИН+тел→OTP), OtpInput(6 ячеек, demoCode-автоподстановка), маска +7 без жёсткой валидации |
| D3 Кабинет: список заявок | done | opus-D | 2026-06-10 | /cabinet: боковое меню (desktop sticky / mobile-вкладки), профиль, список заявок (статус-пилюли, сводка, пустое состояние+CTA), документы/уведомления/поддержка; вкладка из ?tab= |
| D4 Страница заявки + документы | done | opus-D | 2026-06-10 | /cabinet/applications/[uid]: трекер 9 этапов + ветка отказа (STATUS_INDEX), «Что нужно сейчас», каталог требований gov/upload/sign по этапам (past/current/future), демо advance (продвинуть/отклонить/сбросить) + upload/sign |
| D5 SSO demo (eGov/Baiterek) | done | opus-D | 2026-06-10 | SsoButtons (логотипы скопированы в web/public/img/{egov,baiterek}.png, onError-фолбэк на текст) → ssoDemoLogin → completeLogin |

## Трек E — Инфра

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| E1 Dockerfile + Railway (ждёт F1) | done | оркестратор | 2026-06-10 | сервис akk-portal-web (root=web, из репо akk-portal), https://akk-portal-web-production.up.railway.app — все маршруты 200, NEXT_PUBLIC_API_BASE вшит в бандл |
| E2 Перенос Playwright E2E (ждёт B) | todo | — | — | — |
| E3 Аналитика track() (ждёт B7) | todo | — | — | — |
| E4 Перенос в репо akk-portal | done | оркестратор | 2026-06-10 | вся история запушена в github.com/nurtidev/akk-portal; akk-railway = архив/демо |
| E5 Переключение прод-домена | blocked | — | — | финал, после приёмки; Railway-сервисы перевести на репо akk-portal |

## Журнал

- 2026-06-10 — E1 выполнен: Railway-сервис `akk-portal-web` в проекте akk (root directory `web/`, деплой из github.com/nurtidev/akk-portal, Dockerfile standalone). Первый деплой Railway заблокировал из-за CVE в next@15.3.3 → обновлён до ^15.5.19 (70/70 тестов, build зелёный). Прод: https://akk-portal-web-production.up.railway.app — 10 маршрутов 200 на 3 локалях, NEXT_PUBLIC_API_BASE=https://akk-backend-production.up.railway.app вшит в бандл, Go-бэк /health ok.

- 2026-06-10 — приёмка треков B/C/D (оркестратор): 70/70 тестов, build 67 SSG-страниц, smoke 200 на всех маршрутах (/ru, /ru/about, /ru/faq, /ru/contacts, /ru/press, /kk/insurance, /en/investors, /ru/cabinet). Стыковка B↔D: funnel-home.tsx передаёт funnelSubmitAdapter (трек D) в FunnelRoot. Исправления при приёмке: реэкспорт QuestionKey из data/questions.ts (B импортировал его оттуда); 3 неиспользуемых импорта (lint) в contacts/press/application-view. Зоны владения соблюдены, src/data и src/lib логики не тронуты. Открытые хвосты: навигация на контентные страницы из шапки (не добавлена сознательно — зона F); AuthProvider смонтирован дважды (шапка+кабинет, синхронизация через localStorage — для демо ок); мобильный «Войти» в бургере — заглушка; TODO-данные трека C (адреса филиалов, состав СД).
- 2026-06-10 — трек C выполнен (sonnet-C): создано 15 файлов — 12 страниц Next.js SSG (about, reporting, investors, press, press/[slug], faq, contacts, insurance, collateral, procurement, careers + (content)/layout), компонент-библиотека content-page.tsx (ContentPage/Section/Card/CardGrid/AccordionItem/DocumentList/Prose), press-data.ts (8 записей), content.json×3 локали. WebFetch заблокирован — адреса 16 филиалов и состав СД/Правления помечены TODO в JSON; остальное реальное (телефоны, email, адрес ЦА Астана).
- 2026-06-10 — репозиторий: владелец создал отдельный github.com/nurtidev/akk-portal (вместо переименования). Полная история akk-railway запушена туда (`git push portal main`), локальная папка `~/Desktop/agrocredit/akk-portal` синхронизирована. До завершения треков B/C/D работа продолжается в папке akk-railway (там идут параллельные сессии), затем канон — папка akk-portal.

- 2026-06-10 — приёмка треков A и F (оркестратор): web-logic 67/67 тестов (golden-сверка с легаси), web build зелёный, прод-сервер отдаёт 200 на /ru /kk /en. Исправления при приёмке: убран несуществующий пакет @radix-ui/react-sheet; next-intl 3.27.0→^3.26.5 (3.27.0 не существует); починены 3 рукописных теста (sector показывается при investments; toBeCloseTo для float-процентов; добавлен annualRevenue в стресс-кейс — чистый КРС по нормативам Fajr убыточен, ratio=999 это поведение легаси). Реализация во всех трёх случаях совпадала с легаси.
- 2026-06-10 — план и доска созданы; разработка не начата. Каноничная копия репо — эта (`~/Desktop/agrocredit/akk-railway`, origin/main = 5e9482f); копия в `~/Desktop/personal/` устарела (уникальных коммитов нет).
