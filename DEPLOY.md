# Деплой проекта в продакшн

## Важно: Как деплоить каждую часть

### Backend (Node.js/Express) - деплоить как Web Service
- Это серверное приложение, которое должно работать постоянно
- Требует Node.js runtime
- Обрабатывает API запросы, работает с базой данных

### Frontend (React/Vite) - деплоить как Static Site
- Это статические файлы (HTML, CSS, JS), собранные из React
- Не требует сервера Node.js после сборки
- Просто отдает файлы пользователю

---

## Вариант 1: Railway (Backend) + Vercel (Frontend) - Рекомендуется

### Backend на Railway - как Web Service

1. Зарегистрируйтесь: https://railway.app/
2. Создайте новый проект: "New Project" → "Deploy from GitHub repo"
3. Добавьте PostgreSQL:
   - "+ New" → "Database" → "PostgreSQL"
4. Добавьте Web Service:
   - "+ New" → "GitHub Repo" → выберите репозиторий
   - В Settings установите:
     - **Root Directory:** `backend`
     - **Build Command:** (оставьте пустым, Railway определит автоматически)
     - **Start Command:** `npm start`
5. Переменные окружения (Service → Variables):
   ```
   NODE_ENV=production
   PORT=3000
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_NAME=${{Postgres.PGDATABASE}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   JWT_SECRET=ваш_секретный_ключ
   TELEGRAM_BOT_TOKEN=ваш_токен
   TELEGRAM_BOT_USERNAME=ваш_username
   CDN_URL=https://ваш-домен.railway.app/uploads
   ```
6. Получите URL backend после деплоя

### Frontend на Vercel - как Static Site

1. Зарегистрируйтесь: https://vercel.com/
2. "Add New Project" → импортируйте GitHub репозиторий
3. Настройки проекта:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (определится автоматически)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Переменные окружения:
   ```
   VITE_API_URL=https://ваш-backend.railway.app/api
   ```
5. Deploy → получите URL frontend
6. Обновите BotFather с URL от Vercel

---

## Вариант 2: Render (все на одной платформе)

### Backend на Render - как Web Service

1. Зарегистрируйтесь: https://render.com/
2. Создайте PostgreSQL БД:
   - Dashboard → "New" → "PostgreSQL"
   - Бесплатный план подойдет для старта
3. Деплой Backend:
   - "New" → **"Web Service"** (ВАЖНО: не Static Site!)
   - Свяжите GitHub репозиторий
   - Настройки:
     - **Root Directory:** `backend`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free или Starter
   - Environment Variables:
     ```
     NODE_ENV=production
     DB_HOST=ваш_хост_из_Render
     DB_PORT=5432
     DB_NAME=ваша_бд
     DB_USER=ваш_пользователь
     DB_PASSWORD=ваш_пароль
     JWT_SECRET=сгенерируйте_случайный
     TELEGRAM_BOT_TOKEN=ваш_токен
     TELEGRAM_BOT_USERNAME=ваш_username
     ```

### Frontend на Render - как Static Site

1. На Render Dashboard → "New" → **"Static Site"** (ВАЖНО: не Web Service!)
2. Свяжите тот же GitHub репозиторий
3. Настройки:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Environment Variables:
   ```
   VITE_API_URL=https://ваш-backend.onrender.com/api
   ```

---

## Почему разные типы деплоя?

### Backend = Web Service потому что:
- Нужен Node.js runtime для запуска сервера
- Обрабатывает запросы в реальном времени
- Работает с базой данных
- Должен работать постоянно (24/7)

### Frontend = Static Site потому что:
- После сборки это просто HTML/CSS/JS файлы
- Можно отдавать через CDN или статический хостинг
- Не требует сервера
- Быстрее и дешевле

---

## После деплоя

1. Запустите миграцию БД:
   - Railway: PostgreSQL → "Connect" → "Query" → выполните `schema.sql`
   - Render: PostgreSQL → "Info" → "Internal Database URL" → подключитесь и выполните миграцию

2. Обновите URL в BotFather:
   - Используйте URL frontend (от Vercel или Render)
   - URL должен начинаться с `https://`

3. Проверьте работу:
   - Откройте бота в Telegram
   - Mini App должен открыться и работать

---

## Важно для продакшна

1. Безопасность:
   - Используйте сильные пароли для БД
   - JWT_SECRET должен быть длинным и случайным (минимум 32 символа)
   - Никогда не коммитьте `.env` файлы в Git

2. CDN для файлов:
   - Для продакшна используйте Cloudinary, AWS S3, или подобные
   - Обновите `CDN_URL` в переменных окружения backend

3. Мониторинг:
   - Настройте логирование
   - Добавьте health check endpoint (`/health`)
   - Отслеживайте ошибки

4. Производительность:
   - Бесплатные планы могут "засыпать" при неактивности
   - Для продакшна рассмотрите платные планы

---

## Резюме

- **Backend** → Web Service (Railway Web Service / Render Web Service)
- **Frontend** → Static Site (Vercel / Render Static Site)
- **База данных** → PostgreSQL (Railway Database / Render PostgreSQL)

Это самый эффективный и экономичный вариант деплоя.
