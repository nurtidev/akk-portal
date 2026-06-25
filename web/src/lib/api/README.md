# API-клиент akk-portal (трек D)

Слой доступа к Go-бэкенду (`backend/`). Все вызовы — через `web/src/lib/api`.
Контракты эндпоинтов — из `backend/cmd/server/main.go`, `internal/auth/handler.go`,
`internal/credit/handler.go`, `internal/credit/requirements.go`, `internal/store/store.go`.

## Конфигурация

База — `process.env.NEXT_PUBLIC_API_BASE` (Railway variable), без хвостового слэша.

- Переменная **задана** → клиент обращается к `<base>/api/v1/...`.
- Переменная **пуста** → `apiAvailable === false`; каждый вызов возвращает
  `{ ok: false, status: -1, unavailable: true, data: null }`. UI обязан смотреть на
  `unavailable` и уходить в demo-fallback, **не падая**.

Токены хранятся в `localStorage['akk-tokens']` (ключ совместим с легаси `__auth-integration.js`).
Профиль для UI поднимается из JWT-клеймов (`name`, `iin`, `phone`) — `profileFromTokens`.

## Эндпоинты

### auth (`/api/v1/auth/Account`)
| Функция | Метод/путь | Назначение |
| --- | --- | --- |
| `requestSms(iin)` | POST `/RequestSms` | вход: код по SMS (404 — не зарегистрирован) |
| `checkBmgAndSendSmsForRegister(iin, phone)` | POST `/CheckBmgAndSendSmsForRegister` | регистрация: код по SMS |
| `verifySmsCode(iin, code, purpose)` | POST `/VerifySmsCode` | проверка кода; `purpose=login` → токены |
| `smsRegister(req)` | POST `/smsRegister` | завершение регистрации → токены |
| `ssoDemoLogin(provider)` | POST `/ssoDemoLogin` | демо-вход eGov/Baiterek → профиль + токены |
| `me()` | GET `/me` | профиль текущего пользователя (Bearer) |

В DEMO_MODE ответы `RequestSms`/`CheckBmg...` содержат `demoCode` — фронт подставляет его в OTP-ячейки.
`VerifySmsCode` всегда отдаёт HTTP 200 — читать поле `verified`, а не статус.

### credit (`/api/v1/credit`)
| Функция | Метод/путь |
| --- | --- |
| `createApplication(payload)` | POST `/applications` |
| `listApplications()` | GET `/applications` |
| `getApplicationStatus(uid)` | GET `/applications/:uid/status` |
| `advanceApplication(uid, status?)` | POST `/applications/:uid/advance` |
| `cancelApplication(uid, reason?)` | POST `/applications/:uid/cancel` |
| `listDocuments(uid)` | GET `/applications/:uid/documents` |
| `uploadDocument(uid, key, fileName)` | POST `/applications/:uid/documents` |

`advance` без `status` → следующий этап лестницы; `status: 'new'` — сброс, `'rejected'` — отказ.
`status` отдаёт `{ workflow_status, is_terminal, can_cancel, available_actions }` — источник правды
для трекера и кнопки отмены. `cancel` доступен заёмщику только до решения КК (иначе 409).
Все credit-вызовы идут на наш backend (`API_BASE`) с akk-токеном — creditapp отключён.

## Контракт для трека B — `submitApplication`

Трек B (визард подачи заявки) интегрируется через **один** хелпер:

```ts
import { submitApplication, isAuthenticated, type SubmitApplicationPayload } from "@/lib/api";

const payload: SubmitApplicationPayload = {
  requestedAmount: 5_000_000,           // ₸
  loanPurpose: "Инвестиции",            // категория программы или текст
  programId: "agrobusiness",            // '' → индивидуальная консультация
  onboarding: {                          // произвольный снимок воронки (→ JSONB onboarding)
    answers: quizAnswers,
    program: { id, title, category },
    params: { amount, term_months, purpose },
    contact: { name, phone, channel },
  },
};

const res = await submitApplication(payload);
```

Результат (`SubmitResult`):

| Поле | Значение |
| --- | --- |
| `ok` | заявка создана |
| `application` | `{ uid, number, ... }` при `ok` — для перехода на `/cabinet/applications/<uid>` |
| `needAuth` | требуется вход (гость или 401) — откройте модалку логина и повторите вызов после входа |
| `unavailable` | бэкенд не сконфигурирован (`NEXT_PUBLIC_API_BASE` пуст) — покажите demo-успех |
| `status` | HTTP-статус (`401` / `-1` / 5xx); `error` — текст при сбое |
| `needAuth` workflow | `if (res.needAuth) openAuth('login')` → после входа провайдер вызывает отложенное действие |

Отложенный повтор после входа: зарегистрируйте действие через
`useAuth().setPendingAction(() => submitApplication(payload).then(...))` **до** `openAuth('login')` —
`AuthProvider` выполнит его автоматически после `completeLogin`.

Проверка авторизации без сети — `isAuthenticated()`.

## Прочее

- `APP_STAGES` / `appStageIndex` / `rejectLabel` — проекция статуса заявки на 9 клиентских этапов
  (`status.ts`, перенос `STATUS_INDEX` из легаси). Используется кабинетом и страницей заявки.
- `formatPhone` / `onlyDigits` / `splitFio` / `maskPhone` / `initials` — текстовые помощники (`text.ts`).
- SSO-логотипы ожидаются в `web/public/img/egov.png` и `web/public/img/baiterek.png`
  (копия из `img/programs/{egov,baiterek}.png`). При отсутствии файла кнопка показывает текст без лого.
