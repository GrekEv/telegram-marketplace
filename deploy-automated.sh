#!/bin/bash

echo "========================================="
echo "  Автоматическая подготовка к деплою"
echo "========================================="
echo ""

cd "$(dirname "$0")"

# Проверка Git
if [ ! -d ".git" ]; then
  echo "Инициализация Git..."
  git init
  git branch -M main
  echo "✓ Git инициализирован"
fi

# Проверка файлов
echo ""
echo "Проверка файлов проекта..."

MISSING_FILES=0

# Backend
if [ ! -f "backend/package.json" ]; then
  echo "✗ backend/package.json не найден"
  MISSING_FILES=1
fi

if [ ! -f "backend/src/index.js" ]; then
  echo "✗ backend/src/index.js не найден"
  MISSING_FILES=1
fi

if [ ! -f "backend/src/database/schema.sql" ]; then
  echo "✗ backend/src/database/schema.sql не найден"
  MISSING_FILES=1
fi

# Frontend
if [ ! -f "frontend/package.json" ]; then
  echo "✗ frontend/package.json не найден"
  MISSING_FILES=1
fi

if [ ! -f "frontend/vite.config.js" ]; then
  echo "✗ frontend/vite.config.js не найден"
  MISSING_FILES=1
fi

if [ $MISSING_FILES -eq 1 ]; then
  echo ""
  echo "ОШИБКА: Некоторые файлы отсутствуют!"
  exit 1
fi

echo "✓ Все необходимые файлы найдены"

# Проверка .env файлов (не должны быть в Git)
if [ -f "backend/.env" ]; then
  if grep -q "TELEGRAM_BOT_TOKEN" backend/.env; then
    echo "✓ TELEGRAM_BOT_TOKEN настроен"
  else
    echo "⚠  TELEGRAM_BOT_TOKEN не настроен в backend/.env"
  fi
fi

# Подготовка к коммиту
echo ""
echo "Подготовка файлов к коммиту..."

# Убедимся что .env в .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
fi

if ! grep -q "^backend/\.env$" .gitignore 2>/dev/null; then
  echo "backend/.env" >> .gitignore
fi

if ! grep -q "^frontend/\.env$" .gitignore 2>/dev/null; then
  echo "frontend/.env" >> .gitignore
fi

echo "✓ .gitignore обновлен"

# Добавляем все файлы
git add .

echo ""
echo "========================================="
echo "  Готово к деплою!"
echo "========================================="
echo ""
echo "Следующие шаги:"
echo ""
echo "1. Создайте репозиторий на GitHub:"
echo "   https://github.com/new"
echo "   Название: telegram-marketplace"
echo ""
echo "2. Выполните команды:"
echo "   git commit -m 'Initial commit'"
echo "   git remote add origin https://github.com/ВАШ_USERNAME/telegram-marketplace.git"
echo "   git push -u origin main"
echo ""
echo "3. После пуша откройте:"
echo "   - Railway: https://railway.app/"
echo "   - Vercel: https://vercel.com/"
echo ""
echo "4. Следуйте инструкциям в DEPLOY.md"
echo ""

