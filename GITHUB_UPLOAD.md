# Как загрузить проект на GitHub

## Способ 1: Через терминал (рекомендуется)

### Шаг 1: Создайте репозиторий на GitHub

1. Откройте https://github.com/new
2. Заполните:
   - **Repository name:** `telegram-marketplace`
   - **Description:** (опционально) "Telegram Marketplace Platform"
   - **Public** или **Private** (выберите сами)
   - **НЕ ставьте галочки** на:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
3. Нажмите **"Create repository"**

### Шаг 2: Выполните команды в терминале

GitHub покажет страницу с инструкциями. Выполните команды **в терминале**:

```bash
cd ~/Documents/telegram-marketplace

# Добавить удаленный репозиторий (замените YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/telegram-marketplace.git

# Загрузить все файлы
git push -u origin main
```

**Готово!** Все папки и файлы загрузятся на GitHub.

---

## Способ 2: Через GitHub Desktop (визуально)

### Шаг 1: Установите GitHub Desktop

1. Скачайте: https://desktop.github.com/
2. Установите и войдите в GitHub

### Шаг 2: Добавьте репозиторий

1. Откройте GitHub Desktop
2. File → "Add Local Repository"
3. Нажмите "Choose..." и выберите папку:
   `~/Documents/telegram-marketplace`
4. Нажмите "Add repository"

### Шаг 3: Опубликуйте на GitHub

1. В GitHub Desktop нажмите "Publish repository"
2. Название: `telegram-marketplace`
3. Описание: (опционально)
4. Поставьте галочку "Keep this code private" если нужен приватный репозиторий
5. Нажмите "Publish repository"

**Готово!** Все файлы загружены на GitHub.

---

## Способ 3: Через веб-интерфейс GitHub (только для новых файлов)

Этот способ **не подходит** для уже существующего проекта, но можно использовать для добавления отдельных файлов позже.

1. Откройте ваш репозиторий на GitHub
2. Нажмите "Add file" → "Upload files"
3. Перетащите папки/файлы
4. Нажмите "Commit changes"

**Примечание:** Этот способ неудобен для большого проекта. Используйте Способ 1 или 2.

---

## Проверка загрузки

После загрузки откройте ваш репозиторий на GitHub:
`https://github.com/YOUR_USERNAME/telegram-marketplace`

Вы должны увидеть:
- Папку `backend/`
- Папку `frontend/`
- Файлы `README.md`, `DEPLOY.md` и другие
- Все файлы проекта

---

## Что дальше?

После загрузки на GitHub:
1. Откройте Railway: https://railway.app/
2. Откройте Vercel: https://vercel.com/
3. Следуйте инструкциям в `DEPLOY.md` или `QUICK_DEPLOY.md`

---

## Полезные команды Git

```bash
# Проверить статус
git status

# Посмотреть какие файлы добавлены
git status

# Добавить все изменения
git add .

# Создать коммит
git commit -m "Описание изменений"

# Загрузить на GitHub
git push

# Скачать изменения с GitHub
git pull
```

---

## Если что-то пошло не так

### Ошибка "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/telegram-marketplace.git
```

### Ошибка "failed to push"
```bash
# Попробуйте сначала скачать изменения (если репозиторий не пустой)
git pull origin main --allow-unrelated-histories

# Затем загрузите
git push -u origin main
```

### Нужно обновить URL репозитория
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/telegram-marketplace.git
```

---

**Самый простой способ - Способ 1 через терминал!**



