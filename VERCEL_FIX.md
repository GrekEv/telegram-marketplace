# Исправление ошибки 404 на Vercel

## Проблема: 404 ошибка после деплоя

## Решение:

### Шаг 1: Добавьте файл vercel.json

Я создал файл `vercel.json` в папке `frontend/`. Он нужен для правильной работы React Router на Vercel.

Убедитесь, что файл `frontend/vercel.json` существует с содержимым:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Шаг 2: Проверьте настройки в Vercel

1. Откройте ваш проект в Vercel Dashboard
2. Перейдите в **Settings** → **General**
3. Проверьте:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Шаг 3: Проверьте переменные окружения

В **Settings** → **Environment Variables** должна быть:
```
VITE_API_URL=https://telegram-marketplace-production-c6e5.up.railway.app/api
```

### Шаг 4: Проверьте логи деплоя

1. Откройте ваш проект в Vercel
2. Перейдите на вкладку **Deployments**
3. Откройте последний деплой
4. Проверьте **Build Logs**

Убедитесь, что:
- ✅ Build успешно завершился
- ✅ Нет ошибок компиляции
- ✅ Файлы собраны в папку `dist`

### Шаг 5: Запушьте vercel.json на GitHub

Если файл `vercel.json` еще не в репозитории:

```bash
cd ~/Documents/telegram-marketplace
git add frontend/vercel.json
git commit -m "Add vercel.json for SPA routing"
git push
```

После пуша Vercel автоматически перезапустит деплой.

### Шаг 6: Проверьте структуру файлов

В логах деплоя должны быть файлы:
- `index.html`
- `assets/` (папка с JS и CSS)

Если этих файлов нет - проблема в сборке.

---

## Альтернативное решение: через Vercel Dashboard

Если файл vercel.json не помогает, настройте через интерфейс:

1. В Vercel Dashboard → ваш проект → **Settings**
2. Найдите раздел **"Redirects"** или **"Rewrites"**
3. Добавьте правило:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** Rewrite

---

## Проверка работоспособности

После исправления:

1. Откройте URL вашего деплоя в браузере
2. Должен открыться главный экран приложения
3. Если открывается белый экран - проверьте консоль браузера (F12)
4. Проверьте, что API запросы работают

---

## Частые проблемы:

### Белый экран после исправления 404:
- Проверьте консоль браузера (F12) на ошибки
- Убедитесь, что `VITE_API_URL` правильно настроен
- Проверьте, что backend доступен по URL

### Все еще 404:
- Убедитесь, что `Root Directory` = `frontend`
- Проверьте, что `vercel.json` в папке `frontend/`
- Попробуйте пересоздать деплой

---

**После добавления vercel.json и перезапуска деплоя ошибка 404 должна исчезнуть!**

