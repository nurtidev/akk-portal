# Деплой akk-railway backend на Railway

Прототип-бэкенд (SMS-авторизация + подача заявки) для демо `akk-production-4a6b.up.railway.app`.
Схема: **публичный домен бэкенда + CORS** (фронт ходит на бэкенд напрямую, токены в localStorage).

## Что уже сделано в коде (коммит `001b642`, ветка main)
- `backend/` — Go-сервис (Dockerfile внутри).
- `__auth-integration.js` — ленивая активация: работает только когда задан `AKK_BACKEND_URL`.
- `index.html` грузит `/config.js`; nginx отдаёт его из env `AKK_BACKEND_URL`.
- Фронт-`Dockerfile`: `ENV AKK_BACKEND_URL=""` по умолчанию → **без переменной демо остаётся моком** (пуш безопасен).

## Шаги деплоя (проект `akk`, id `ce4f7fc3-ca63-4bce-88f2-f09de47b532e`)

1. **Запушить main** (или смержить ветку) → сервис `akk` (фронт) пересоберётся, останется в мок-режиме (безопасно).

2. **Postgres**: создать в проекте `akk` (Railway → New → Database → PostgreSQL). Даёт `DATABASE_URL`.

3. **Сервис `akk-backend`**: New → GitHub Repo → `nurtidev/akk-railway`,
   **Root Directory = `backend`** (там Dockerfile). Переменные:
   | Переменная | Значение |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
   | `JWT_SECRET` | длинный случайный (≥32 байт), напр. `openssl rand -hex 32` |
   | `ALLOWED_ORIGINS` | `https://akk-production-4a6b.up.railway.app` |
   | `SMS_URL` | пусто (mock на старте) |
   | `OTP_DEBUG_RETURN` | `false` |
   | `PORT` | Railway задаёт автоматически |

   Боевые SMS позже: `SMS_URL=https://so.kazinfoteh.org/api/sms/send`, `SMS_LOGIN`, `SMS_PASSWORD`, `SMS_ORIGINATOR` (креды KazInfoTeh — только в Railway Variables, не в код).

4. **Публичный домен** для `akk-backend` (Settings → Networking → Generate Domain). Получим, напр. `https://akk-backend-production-xxxx.up.railway.app`.

5. **Проверить бэкенд**: `GET <backend-domain>/health` → `{"status":"ok"}`.

6. **Включить интеграцию на фронте**: на сервисе `akk` задать
   `AKK_BACKEND_URL = <backend-domain>` (без хвостового `/`) → redeploy `akk`.

7. **Проверка вживую** (mock SMS): онбординг → подать заявку → регистрация (ИИН+ФИО+тел) →
   код смотрим в логах `akk-backend` (`sms[MOCK]: ... text=Код подтверждения АКК: NNNNNN`) →
   вводим → заявка `AKK-2026-NNNNNN` → личный кабинет показывает её.

8. **Боевые SMS**: добавить `SMS_*` креды на `akk-backend` → redeploy. Код начнёт приходить по SMS.

## Откат
- Снять `AKK_BACKEND_URL` с сервиса `akk` (или выставить пустым) + redeploy → фронт вернётся к моку.
