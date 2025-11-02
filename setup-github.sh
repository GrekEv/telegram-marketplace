#!/bin/bash

# Скрипт для настройки GitHub аутентификации с использованием токена

echo "========================================="
echo "  Настройка GitHub с токеном"
echo "========================================="
echo ""

# GitHub токен (введите ваш токен)
REPO_NAME="telegram-marketplace"

# Спросить токен
read -sp "Введите ваш GitHub Personal Access Token: " GITHUB_TOKEN
echo ""

# Спросить username
read -p "Введите ваш GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Токен не может быть пустым!"
  exit 1
fi

if [ -z "$GITHUB_USERNAME" ]; then
  echo "❌ Username не может быть пустым!"
  exit 1
fi

cd "$(dirname "$0")"

# Удалить старый remote если есть
if git remote get-url origin &>/dev/null; then
  echo "Удаление старого remote..."
  git remote remove origin
fi

# Настроить remote с токеном
GITHUB_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
git remote add origin "$GITHUB_URL"

echo ""
echo "✓ Remote настроен с токеном"
echo ""

# Проверить статус
echo "Проверка статуса Git..."
git status

echo ""
echo "========================================="
echo "  Готово!"
echo "========================================="
echo ""
echo "Теперь вы можете выполнить:"
echo "  git add ."
echo "  git commit -m 'Initial commit'"
echo "  git push -u origin main"
echo ""
echo "⚠️  ВАЖНО: Токен сохранен в конфигурации Git."
echo "    После пуша рекомендуется удалить токен из URL:"
echo "    git remote set-url origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
echo ""
echo "    Затем используйте токен через git credential helper:"
echo "    (токен будет запрошен при следующем push)"
echo ""

