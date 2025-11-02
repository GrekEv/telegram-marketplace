# Настройка GitHub с токеном

⚠️ **ВАЖНО:** Никогда не коммитьте токены в репозиторий!

## Быстрая настройка

### Шаг 1: Получите ваш GitHub токен

1. Откройте: https://github.com/settings/tokens
2. Нажмите "Generate new token" → "Generate new token (classic)"
3. Дайте название токену
4. Выберите права доступа: `repo` (полный доступ к репозиториям)
5. Скопируйте токен (он показывается только один раз!)

### Шаг 2: Замените YOUR_USERNAME и YOUR_TOKEN

Выполните команды (замените `YOUR_USERNAME` и `YOUR_TOKEN`):

```bash
cd ~/Documents/telegram-marketplace

# Удалить старый remote
git remote remove origin

# Добавить remote с токеном (вставьте ваш токен вместо YOUR_TOKEN)
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/telegram-marketplace.git
```

### Шаг 2: Закоммитьте и запушьте

```bash
# Проверить статус
git status

# Добавить все файлы
git add .

# Создать коммит
git commit -m "Initial commit: Telegram Marketplace Platform"

# Запушить на GitHub
git push -u origin main
```

## Альтернатива: через скрипт

Запустите скрипт (он спросит ваш username):

```bash
./setup-github.sh
```

## После успешного пуша (рекомендуется для безопасности)

После того как код запушен, обновите remote без токена в URL:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/telegram-marketplace.git
```

Затем настройте git credential helper для безопасного хранения токена:

```bash
# macOS
git config --global credential.helper osxkeychain

# Затем при следующем push введите токен в качестве пароля
```

Или используйте переменную окружения:

```bash
# Вставьте ваш токен вместо YOUR_TOKEN
export GIT_ASKPASS="echo YOUR_TOKEN"
git push -u origin main
```

## Важно для безопасности

⚠️ **НЕ коммитьте токен в код!**
- Токен уже должен быть в `.gitignore`
- Убедитесь, что файлы с токенами не попали в репозиторий
- Если токен случайно закоммичен, отзовите его на GitHub и создайте новый

## Проверка

После пуша откройте ваш репозиторий:
`https://github.com/YOUR_USERNAME/telegram-marketplace`

Вы должны увидеть все файлы проекта.

---

**Далее:** Следуйте инструкциям в `DEPLOY.md` для деплоя на Railway и Vercel.

