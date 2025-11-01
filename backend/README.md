# Backend - Telegram Marketplace

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Настройте переменные окружения в `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - параметры PostgreSQL
   - `JWT_SECRET` - секретный ключ для JWT токенов
   - `TELEGRAM_BOT_TOKEN` - токен Telegram бота
   - `PORT` - порт сервера (по умолчанию 3000)

## База данных

1. Установите PostgreSQL

2. Создайте базу данных:
```sql
CREATE DATABASE telegram_marketplace;
```

3. Запустите миграцию:
```bash
npm run migrate
```

Это создаст все необходимые таблицы и структуры.

## Запуск

### Режим разработки:
```bash
npm run dev
```

### Продакшн:
```bash
npm start
```

Сервер будет доступен по адресу `http://localhost:3000`

API endpoints:
- `POST /api/auth/telegram` - авторизация через Telegram
- `GET /api/auth/me` - получить текущего пользователя
- `GET /api/users/feed` - получить ленту товаров
- `GET /api/users/search` - поиск товаров и продавцов
- `GET /api/products/:id` - информация о товаре
- `GET /api/products/seller/:id` - профиль продавца
- `POST /api/sellers/apply` - подать заявку на создание магазина
- `POST /api/sellers/products` - добавить товар
- `POST /api/orders` - создать заказ
- И другие...

## Структура проекта

```
backend/
├── src/
│   ├── index.js              # Главный файл сервера
│   ├── database/
│   │   ├── connection.js     # Подключение к БД
│   │   ├── schema.sql        # SQL схема БД
│   │   └── migrate.js         # Скрипт миграции
│   ├── middleware/
│   │   └── auth.js           # Middleware для авторизации
│   └── routes/
│       ├── auth.js           # Роуты авторизации
│       ├── users.js          # Роуты пользователей
│       ├── sellers.js        # Роуты продавцов
│       ├── products.js       # Роуты товаров
│       ├── orders.js         # Роуты заказов
│       └── admin.js          # Роуты админки
├── uploads/                  # Загруженные файлы
└── package.json
```

