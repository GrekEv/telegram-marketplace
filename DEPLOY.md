# Деплой проекта

## Backend на Railway

1. Создайте проект на Railway.app
2. Добавьте PostgreSQL: "+ New" → "Database" → "PostgreSQL"
3. Добавьте Web Service: "+ New" → "GitHub Repo"
4. Настройки Web Service:
   - Root Directory: `backend`
   - Start Command: `npm start`
5. Переменные окружения:
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   JWT_SECRET=сгенерировать_через_openssl_rand_-hex_32
   TELEGRAM_BOT_TOKEN=токен_от_BotFather
   TELEGRAM_BOT_USERNAME=username_бота
   CDN_URL=https://ваш-домен.railway.app/uploads
   ```
6. Выполните миграцию БД:
   - PostgreSQL → Connect → скопируйте команду psql
   - Выполните: `psql -h хост -U postgres -d railway -f backend/src/database/schema.sql`
7. Добавьте тестовые товары:
   - Выполните: `psql -h хост -U postgres -d railway -f backend/src/database/seed_test_data.sql`
8. Добавьте администраторов:
   - Выполните: `psql -h хост -U postgres -d railway -f backend/src/database/seed_admins.sql`
9. Получите URL backend: Settings → Generate Domain

## Frontend на Vercel

1. Создайте проект на Vercel.com
2. Импортируйте GitHub репозиторий
3. Настройки:
   - Root Directory: `frontend`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Переменная окружения:
   ```
   VITE_API_URL=https://ваш-backend.railway.app/api
   ```
5. Deploy → скопируйте URL frontend

## Настройка BotFather

1. Откройте @BotFather в Telegram
2. `/myapps` → выберите Mini App
3. `/editapp` → "Edit URL" → вставьте URL от Vercel

## Обновление кода

После изменений:
```bash
git add .
git commit -m "описание изменений"
git push
```

Railway и Vercel автоматически перезапустят приложение.
