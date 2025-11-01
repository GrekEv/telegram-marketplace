# Инструкция по установке и запуску

## Предварительные требования

- Node.js 18+ и npm
- PostgreSQL 14+
- Telegram бот (для тестирования Mini App)

## Шаг 1: Установка зависимостей

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Шаг 2: Настройка базы данных

1. Установите PostgreSQL (если еще не установлен)

2. Создайте базу данных:
```sql
CREATE DATABASE telegram_marketplace;
```

3. Создайте пользователя (опционально):
```sql
CREATE USER marketplace_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE telegram_marketplace TO marketplace_user;
```

## Шаг 3: Настройка Backend

1. Перейдите в папку `backend`

2. Создайте файл `.env`:
```bash
cp .env.example .env
```

3. Отредактируйте `.env`:
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=telegram_marketplace
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_very_secret_jwt_key_change_this

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username

UPLOAD_PATH=./uploads
CDN_URL=http://localhost:3000/uploads
```

4. Создайте папку для загрузок:
```bash
mkdir uploads
```

5. Запустите миграцию БД:
```bash
npm run migrate
```

6. Запустите сервер:
```bash
npm run dev
```

Сервер должен запуститься на `http://localhost:3000`

## Шаг 4: Настройка Frontend

1. Перейдите в папку `frontend`

2. Создайте файл `.env` (опционально):
```bash
cp .env.example .env
```

3. Убедитесь, что `VITE_API_URL` указывает на ваш backend:
```env
VITE_API_URL=http://localhost:3000/api
```

4. Запустите dev-сервер:
```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5173`

## Шаг 5: Тестирование локально

### Через ngrok (для тестирования в Telegram)

1. Установите [ngrok](https://ngrok.com/)

2. Запустите ngrok для frontend:
```bash
ngrok http 5173
```

3. Используйте полученный URL (например, `https://abc123.ngrok.io`) в настройках Mini App в Telegram

### Или используйте Telegram Web Apps Tester

Откройте [Telegram Web Apps Tester](https://web.telegram.org/k/) и введите URL вашего приложения.

## Создание первого суперадмина

После запуска миграции, создайте суперадмина через SQL:

```sql
-- Найти ID пользователя (после регистрации через Telegram)
SELECT id, telegram_id, username FROM users WHERE telegram_id = YOUR_TELEGRAM_ID;

-- Обновить роль на superadmin
UPDATE users SET role = 'superadmin' WHERE id = 'USER_ID_FROM_ABOVE';
```

Или через API после регистрации первого пользователя.

## Проверка работы

1. Откройте frontend в браузере или через Telegram Mini App
2. Вы должны автоматически авторизоваться через Telegram
3. Попробуйте:
   - Просмотреть ленту товаров
   - Подать заявку на создание магазина
   - Посмотреть профиль пользователя

## Полезные команды

### Backend
- `npm run dev` - запуск в режиме разработки
- `npm start` - запуск в продакшн режиме
- `npm run migrate` - выполнить миграцию БД

### Frontend
- `npm run dev` - запуск dev сервера
- `npm run build` - сборка для продакшна
- `npm run preview` - предпросмотр собранного приложения
