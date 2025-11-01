# Быстрый деплой - команды для копирования

## 1. Создайте GitHub репозиторий

Откройте: https://github.com/new
- Название: `telegram-marketplace`
- НЕ добавляйте README, .gitignore, лицензию
- Нажмите "Create repository"

## 2. Запушьте код в GitHub

После создания репозитория выполните (замените YOUR_USERNAME):

```bash
cd ~/Documents/telegram-marketplace
git remote add origin https://github.com/YOUR_USERNAME/telegram-marketplace.git
git push -u origin main
```

## 3. Backend на Railway

1. Откройте: https://railway.app/ → войдите через GitHub
2. "New Project" → "Deploy from GitHub repo" → выберите репозиторий
3. Добавьте PostgreSQL: "+ New" → "Database" → "PostgreSQL"
4. Добавьте Web Service: "+ New" → "GitHub Repo" → выберите репозиторий
5. Настройте Web Service:
   - Settings → Root Directory: `backend`
   - Settings → Start Command: `npm start`
6. Variables (замените `Postgres` на имя вашего БД сервиса):
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   JWT_SECRET=ВСТАВЬТЕ_СГЕНЕРИРОВАННЫЙ_КЛЮЧ
   TELEGRAM_BOT_TOKEN=8303779823:AAGcSGhYniXaPRoyoPwnBtE39yF51SHjsvQ
   TELEGRAM_BOT_USERNAME=467035682
   CDN_URL=https://ваш-backend.railway.app/uploads
   ```
7. Сгенерируйте JWT_SECRET:
   ```bash
   openssl rand -hex 32
   ```
8. Миграция: PostgreSQL → Connect → Query → вставьте содержимое `backend/src/database/schema.sql` → Run
9. Скопируйте URL backend (Settings → Generate Domain)

## 4. Frontend на Vercel

1. Откройте: https://vercel.com/ → войдите через GitHub
2. "Add New Project" → импортируйте репозиторий
3. Root Directory: `frontend`
4. Environment Variables:
   ```
   VITE_API_URL=https://ваш-backend.railway.app/api
   ```
5. Deploy → скопируйте URL frontend

## 5. Обновите BotFather

1. Откройте @BotFather в Telegram
2. `/myapps` → выберите Mini App
3. `/editapp` → "Edit URL" → вставьте URL от Vercel

Готово!

