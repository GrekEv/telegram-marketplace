# Telegram Marketplace Platform

Платформа для продажи мерча и цифровых товаров внутри Telegram Mini App.

## Структура проекта

- `backend/` - Node.js + Express сервер
- `frontend/` - React приложение для Telegram Mini App

## Установка

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Заполните .env файл
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Заполните .env файл
npm run dev
```

## Деплой

См. `DEPLOY.md`

## Технологии

- Backend: Node.js, Express, PostgreSQL
- Frontend: React, Vite, Telegram WebApp API
