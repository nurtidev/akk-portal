# akk-portal-logic

Самостоятельный TypeScript-пакет с **чистой бизнес-логикой** онбординга АКК
(трек A плана). Перенос 1-в-1 из легаси-прототипа `index.html` (строки ≈2389–4250).

Здесь **нет** React, DOM, сети — только функции и данные. Интеграция в `web/src`
(Next.js) — отдельная задача; этот пакет будет переиспользован как источник правды.

## Состав

- `src/data/programs.ts` — типы + `PROGRAMS` (7 программ) + `PROGRAM_DETAILS`.
- `src/data/questions.ts` — вопросы квиза + `getQuestions()` (условные ветки).
- `src/data/fajr-norms.ts` — `FAJR_NORMS` по 4 видам животных.
- `src/lib/scoring.ts` — `scoreProgram` / `explainProgram` / `scoredPrograms`.
- `src/lib/schedule.ts` — `calculateSchedule` / `effectiveMaxTerm` / `pickInitialTerm`.
- `src/lib/stress.ts` — `calculateStress` (Fajr-lite).
- `src/lib/format.ts` — `fmtAmount` / `fmtRate` / `declension`.

## Команды

```bash
npm install
npm test          # vitest run
npm run typecheck # tsc --noEmit
```

## Принцип

Цифры новых TS-функций должны совпадать с легаси **до тенге**. Для гарантии паритета
есть golden-тесты: легаси-функции скопированы дословно в `tests/fixtures/legacy.cjs`
и сверяются с новыми TS на сетке входов.
