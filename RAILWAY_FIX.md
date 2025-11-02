# Исправление ошибки Railway "Railpack could not determine how to build the app"

## Проблема
Railway не может определить, как собрать приложение, потому что ищет файлы в корне, а `package.json` находится в папке `backend/`.

## Решение

### Вариант 1: Настроить Root Directory в Railway (РЕКОМЕНДУЕТСЯ)

1. Откройте ваш проект на Railway: https://railway.app/
2. Выберите ваш **Web Service** (не PostgreSQL!)
3. Перейдите в **Settings**
4. Найдите раздел **Root Directory**
5. Установите значение: `backend`
6. Сохраните изменения
7. Railway автоматически перезапустит деплой

### Вариант 2: Использовать созданные конфигурационные файлы

Я создал файлы `railway.json` и `nixpacks.toml` в корне проекта. Они должны помочь Railway найти правильную директорию.

После пуша этих файлов на GitHub, Railway должен автоматически подхватить настройки.

### Проверка

После настройки Root Directory или после пуша конфигурационных файлов:

1. Railway должен начать сборку автоматически
2. В логах вы должны увидеть:
   - `Found package.json`
   - `Installing dependencies`
   - `Starting application`

### Если ошибка сохраняется

1. Убедитесь, что в **Settings → Root Directory** установлено `backend` (без слеша в начале!)
2. Убедитесь, что файл `backend/package.json` существует
3. Проверьте логи деплоя в Railway Dashboard
4. Попробуйте пересоздать сервис:
   - Удалите текущий Web Service
   - Создайте новый
   - При создании сразу установите Root Directory = `backend`

---

**Важно:** Root Directory должен быть установлен **ПЕРЕД** первым деплоем!

