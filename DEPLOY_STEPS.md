# Пошаговая инструкция по деплою

## Шаг 1: Подготовка проекта

Выполните в терминале:

```bash
cd ~/Documents/telegram-marketplace
chmod +x deploy-automated.sh
./deploy-automated.sh
```

Это проверит все файлы и подготовит проект к коммиту.

## Шаг 2: Создание GitHub репозитория

1. Откройте: https://github.com/new
2. Название репозитория: `telegram-marketplace`
3. Выберите: Private или Public (по желанию)
4. НЕ добавляйте README, .gitignore, лицензию (все уже есть)
5. Нажмите "Create repository"

## Шаг 3: Пуш кода в GitHub

После создания репозитория GitHub покажет инструкции. Выполните:

```bash
cd ~/Documents/telegram-marketplace

# Если еще не закоммитили
git commit -m "Initial commit: Telegram Marketplace Platform"

# Добавьте удаленный репозиторий (замените YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/telegram-marketplace.git

# Запушьте код
git push -u origin main
```

## Шаг 4: Деплой Backend на Railway

1. Откройте: https://railway.app/
2. Войдите через GitHub
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Выберите репозиторий `telegram-marketplace`

### Добавление PostgreSQL:

1. В проекте нажмите "+ New"
2. Выберите "Database" → "PostgreSQL"
3. Railway создаст БД автоматически
4. Запомните имя сервиса (например: "Postgres")

### Добавление Web Service (Backend):

1. В проекте нажмите "+ New"
2. Выберите "GitHub Repo"
3. Выберите репозиторий `telegram-marketplace`
4. Откройте созданный сервис → "Settings"
5. Установите:
   - **Root Directory:** `backend`
   - **Start Command:** `npm start`
6. Сохраните

### Настройка переменных окружения:

1. Откройте Web Service → "Variables" → "New Variable"
2. Добавьте переменные (замените Postgres на имя вашего БД сервиса):

```
NODE_ENV=production
PORT=3000
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=сгенерируйте_случайную_строку_минимум_32_символа
TELEGRAM_BOT_TOKEN=8303779823:AAGcSGhYniXaPRoyoPwnBtE39yF51SHjsvQ
TELEGRAM_BOT_USERNAME=467035682
CDN_URL=https://ваш-домен.railway.app/uploads
```

**Важно:** Замените `Postgres` на имя вашего PostgreSQL сервиса если оно другое!

### Генерация JWT_SECRET:

```bash
# В терминале выполните:
openssl rand -hex 32
```

Скопируйте результат и используйте как JWT_SECRET.

### Получение URL backend:

1. Откройте Web Service → "Settings"
2. Нажмите "Generate Domain"
3. Скопируйте URL (например: `https://telegram-marketplace-production.up.railway.app`)
4. Обновите CDN_URL этой ссылкой (замените `/uploads` на `/uploads`)

### Запуск миграции БД:

1. Откройте PostgreSQL сервис → "Connect" → "Query"
2. Откройте файл `backend/src/database/schema.sql`
3. Скопируйте весь SQL код
4. Вставьте в Query Editor в Railway
5. Нажмите "Run"

## Шаг 5: Деплой Frontend на Vercel

1. Откройте: https://vercel.com/
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Импортируйте репозиторий `telegram-marketplace`

### Настройка проекта:

1. Root Directory: `frontend`
2. Framework Preset: Vite (определится автоматически)
3. Build Command: `npm run build` (автоматически)
4. Output Directory: `dist` (автоматически)

### Переменные окружения:

1. Откройте "Environment Variables"
2. Добавьте:
   ```
   VITE_API_URL=https://ваш-backend.railway.app/api
   ```
   (Замените на реальный URL из Railway)

3. Нажмите "Deploy"

### Получение URL frontend:

После деплоя Vercel даст URL:
- Например: `https://telegram-marketplace.vercel.app`
- Или: `https://telegram-marketplace-xxx.vercel.app`

## Шаг 6: Обновление BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте: `/myapps`
3. Выберите ваш Mini App
4. Отправьте: `/editapp`
5. Выберите "Edit URL"
6. Вставьте URL от Vercel (например: `https://telegram-marketplace.vercel.app`)
7. Готово!

## Шаг 7: Проверка работы

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку Mini App
3. Приложение должно открыться
4. Проверьте:
   - Авторизация работает
   - Лента товаров загружается
   - Можно просматривать товары

## Обновление кода

После изменений просто:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Railway и Vercel автоматически перезапустят приложение!

## Troubleshooting

### Backend не запускается:
- Проверьте логи в Railway (Dashboard → Service → "Deploy Logs")
- Убедитесь, что все переменные окружения установлены
- Проверьте, что миграция БД выполнена

### Frontend не работает:
- Проверьте URL API в переменных окружения Vercel
- Убедитесь, что backend доступен (откройте URL в браузере)
- Проверьте CORS настройки

### Mini App не открывается:
- URL должен начинаться с `https://`
- Проверьте, что frontend задеплоен
- Попробуйте открыть URL в браузере

### Ошибка авторизации:
- Проверьте TELEGRAM_BOT_TOKEN в Railway
- Убедитесь, что backend запущен и доступен
- Проверьте логи backend

---

Готово! Проект задеплоен и работает в продакшне!

