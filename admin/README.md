# АКК · Админ-панель

Административная панель для портала АО «Аграрная кредитная корпорация». Позволяет просматривать и управлять заявками на кредит: изменять статусы, добавлять комментарии, отклонять или одобрять заявки.

## Стек

- **Next.js 15.5** (App Router, standalone output)
- **React 19.1**
- **TypeScript 5**
- **Tailwind CSS 3.4**

## Команды

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен-сервера
npm start
```

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Базовый URL Go-бэкенда | `http://localhost:8080` |

Скопируйте `.env.example` в `.env.local` и задайте нужные значения:

```bash
cp .env.example .env.local
```

## Демо-доступ

По умолчанию бэкенд в режиме `DEMO_MODE=true` принимает следующие учётные данные:

- **Логин**: `admin`
- **Пароль**: `akk-admin-2026`

## Используемые эндпоинты

Все запросы идут на `NEXT_PUBLIC_API_BASE`:

- `POST /api/v1/admin/login` — аутентификация
- `GET /api/v1/admin/stats` — статистика по статусам
- `GET /api/v1/admin/applications` — список заявок (фильтр по `?status=`)
- `GET /api/v1/admin/applications/:uid` — карточка заявки
- `POST /api/v1/admin/applications/:uid/decision` — действие над заявкой

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_BASE=http://your-backend:8080 -t akk-admin .
docker run -p 8080:8080 akk-admin
```
