# Как добавить тестовые товары в базу данных

## Способ 1: Через Railway Dashboard (проще всего)

### Шаг 1: Откройте PostgreSQL в Railway

1. Откройте Railway Dashboard: https://railway.app/
2. Откройте ваш проект
3. Найдите сервис **PostgreSQL** (или **Postgres**)
4. Нажмите на него

### Шаг 2: Откройте Query Editor

1. В PostgreSQL сервисе найдите вкладку **"Query"** или **"Database"**
2. Если есть кнопка **"Query"** или **"SQL Editor"** - нажмите на неё
3. Откроется окно для ввода SQL команд

### Шаг 3: Скопируйте и выполните SQL

1. Откройте файл `backend/src/database/seed_test_data.sql` в вашем проекте
2. Скопируйте **весь текст** из файла
3. Вставьте в Query Editor в Railway
4. Нажмите **"Run"** или **"Execute"**

Готово! Товары добавлены.

---

## Способ 2: Через терминал на вашем компьютере

### Шаг 1: Получите данные подключения

1. В Railway → PostgreSQL → **"Connect"**
2. Найдите раздел **"Connection String"** или **"Connection URL"**
3. Скопируйте URL (например: `postgresql://postgres:пароль@maglev.proxy.rlwy.net:15153/railway`)
4. Или скопируйте отдельные данные:
   - Host: `maglev.proxy.rlwy.net` (ваш хост может отличаться)
   - Port: `15153` (ваш порт может отличаться)
   - Database: `railway`
   - User: `postgres`
   - Password: (скопируйте пароль, нажав "show")

### Шаг 2: Выполните команду в терминале

Откройте терминал на вашем Mac и выполните (замените данные на ваши):

```bash
cd ~/Documents/telegram-marketplace

PGPASSWORD=ваш_пароль_из_railway psql -h maglev.proxy.rlwy.net -U postgres -p 15153 -d railway -f backend/src/database/seed_test_data.sql
```

**Пример с реальными данными:**
```bash
PGPASSWORD=JbAOkBXzrwVTEjXkzSjiNCxQjvdhpgDb psql -h maglev.proxy.rlwy.net -U postgres -p 15153 -d railway -f backend/src/database/seed_test_data.sql
```

Если появится сообщение "NOTICE: Тестовые данные успешно добавлены!" - всё готово!

---

## Способ 3: Через psql подключение (интерактивно)

### Шаг 1: Подключитесь к базе

1. В Railway → PostgreSQL → **"Connect"**
2. Скопируйте команду **"Raw psql command"**
3. Нажмите "show" чтобы увидеть пароль
4. Вставьте команду в терминал на Mac и выполните

Пример команды:
```bash
PGPASSWORD=ваш_пароль psql -h maglev.proxy.rlwy.net -U postgres -p 15153 -d railway
```

### Шаг 2: Выполните SQL скрипт

После подключения (увидите `railway=>`) выполните:

```sql
\i backend/src/database/seed_test_data.sql
```

Или просто скопируйте содержимое файла `seed_test_data.sql` и вставьте в psql, затем нажмите Enter.

---

## Проверка

После выполнения любого способа:

1. Откройте ваше приложение в Telegram
2. Перейдите в ленту товаров
3. Должны появиться 6 тестовых товаров:
   - Футболка "Telegram Stars"
   - Курс по React разработке
   - Кепка с эмблемой
   - Промокод на подписку Premium
   - Толстовка с принтом
   - Набор стикеров Pro

---

## Если не получается

Проверьте:
- Файл `seed_test_data.sql` существует в проекте
- Миграция БД выполнена (таблицы созданы)
- PostgreSQL сервис запущен в Railway

