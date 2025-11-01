# Frontend - Telegram Marketplace Mini App

React приложение для Telegram Mini App.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` (опционально):
```bash
cp .env.example .env
```

3. Настройте `VITE_API_URL` в `.env` (по умолчанию `http://localhost:3000/api`)

## Запуск

### Режим разработки:
```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`

### Сборка для продакшна:
```bash
npm run build
```

Собранные файлы будут в папке `dist/`

## Тестирование в Telegram

Для тестирования Mini App в Telegram:

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Используйте команду `/newapp` для создания Mini App
3. Укажите URL вашего приложения (например, через ngrok для локальной разработки)

Или используйте [Telegram Web Apps Tester](https://web.telegram.org/k/) для тестирования без бота.

## Структура проекта

```
frontend/
├── src/
│   ├── main.jsx              # Точка входа
│   ├── App.jsx               # Главный компонент
│   ├── contexts/
│   │   └── AuthContext.jsx   # Контекст авторизации
│   ├── components/
│   │   ├── Header.jsx       # Шапка приложения
│   │   └── Header.css
│   ├── pages/
│   │   ├── Feed.jsx          # Лента товаров
│   │   ├── ProductDetail.jsx # Страница товара
│   │   ├── SellerProfile.jsx # Профиль продавца
│   │   ├── MyShop.jsx        # Мой магазин
│   │   ├── Profile.jsx       # Профиль пользователя
│   │   └── Login.jsx         # Авторизация
│   └── utils/
│       └── api.js            # API клиент
├── index.html
└── package.json
```

