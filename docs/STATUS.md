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
| B1 ProgramGrid + ProgramModal | todo | — | — | — |
| B2 Quiz | todo | — | — | — |
| B3 Results | todo | — | — | — |
| B4 Calculator | todo | — | — | — |
| B5 StressTest | todo | — | — | — |
| B6 ApplyWizard + Success | todo | — | — | — |
| B7 Главная (Hero + сборка) | todo | — | — | — |

## Трек C — Контент (ждёт F3/F4)

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| C1 Шаблон контентной страницы | todo | — | — | — |
| C2 О компании / управление | todo | — | — | — |
| C3 Отчётность / инвесторам | todo | — | — | — |
| C4 Пресс-центр | todo | — | — | — |
| C5 FAQ | todo | — | — | — |
| C6 Контакты / филиалы | todo | — | — | — |
| C7 Страхование/залоги/закупки/вакансии | todo | — | — | — |

## Трек D — Auth + кабинет (ждёт F4)

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| D1 API-клиент к Go-бэку | todo | — | — | — |
| D2 SMS-auth UI | todo | — | — | — |
| D3 Кабинет: список заявок | todo | — | — | — |
| D4 Страница заявки + документы | todo | — | — | — |
| D5 SSO demo (eGov/Baiterek) | todo | — | — | — |

## Трек E — Инфра

| Задача | Статус | Кто | Дата | Итог |
| --- | --- | --- | --- | --- |
| E1 Dockerfile + Railway (ждёт F1) | todo | — | — | — |
| E2 Перенос Playwright E2E (ждёт B) | todo | — | — | — |
| E3 Аналитика track() (ждёт B7) | todo | — | — | — |
| E4 Переименование репо → akk-portal | blocked | — | — | нужно подтверждение владельца |
| E5 Переключение прод-домена | blocked | — | — | финал, после приёмки |

## Журнал

- 2026-06-10 — приёмка треков A и F (оркестратор): web-logic 67/67 тестов (golden-сверка с легаси), web build зелёный, прод-сервер отдаёт 200 на /ru /kk /en. Исправления при приёмке: убран несуществующий пакет @radix-ui/react-sheet; next-intl 3.27.0→^3.26.5 (3.27.0 не существует); починены 3 рукописных теста (sector показывается при investments; toBeCloseTo для float-процентов; добавлен annualRevenue в стресс-кейс — чистый КРС по нормативам Fajr убыточен, ratio=999 это поведение легаси). Реализация во всех трёх случаях совпадала с легаси.
- 2026-06-10 — план и доска созданы; разработка не начата. Каноничная копия репо — эта (`~/Desktop/agrocredit/akk-railway`, origin/main = 5e9482f); копия в `~/Desktop/personal/` устарела (уникальных коммитов нет).
