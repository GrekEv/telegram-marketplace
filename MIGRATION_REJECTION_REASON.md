# Миграция: Добавление полей rejection_reason и rejection_advice

## Способ 1: Через Railway Dashboard (самый простой)

### Шаг 1: Откройте PostgreSQL в Railway

1. Откройте https://railway.app/
2. Войдите в свой проект
3. Найдите сервис **PostgreSQL** (или **Postgres**)
4. Нажмите на него

### Шаг 2: Откройте Query Editor

1. В PostgreSQL сервисе найдите вкладку **"Query"** или **"Database"**
2. Если есть кнопка **"Query"** или **"SQL Editor"** - нажмите на неё
3. Откроется окно для ввода SQL команд

### Шаг 3: Выполните миграцию

Скопируйте и вставьте следующий SQL:

```sql
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_advice TEXT;
```

Нажмите **"Run"** или **"Execute"**

Готово! Поля добавлены.

---

## Способ 2: Через терминал (psql)

### Шаг 1: Получите данные подключения

1. В Railway → PostgreSQL → **"Connect"**
2. Найдите раздел **"Connection String"** или **"Connection URL"**
3. Скопируйте URL или отдельные данные:
   - Host (например: `maglev.proxy.rlwy.net`)
   - Port (например: `15153`)
   - Database: `railway`
   - User: `postgres`
   - Password (нажмите "show" чтобы увидеть)

### Шаг 2: Выполните команду в терминале

Откройте терминал на вашем Mac и выполните (замените данные на ваши):

```bash
cd ~/Documents/telegram-marketplace

PGPASSWORD=ваш_пароль_из_railway psql -h ваш_хост -U postgres -p ваш_порт -d railway -c "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT; ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_advice TEXT;"
```

**Пример с реальными данными (замените на свои):**
```bash
PGPASSWORD=JbAOkBXzrwVTEjXkzSjiNCxQjvdhpgDb psql -h maglev.proxy.rlwy.net -U postgres -p 15153 -d railway -c "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT; ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_advice TEXT;"
```

Или используйте файл миграции:

```bash
PGPASSWORD=ваш_пароль_из_railway psql -h ваш_хост -U postgres -p ваш_порт -d railway -f backend/src/database/migration_add_rejection_reason.sql
```

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

### Шаг 2: Выполните SQL команды

После подключения (увидите `railway=>`) выполните:

```sql
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_advice TEXT;
```

Нажмите Enter. Если увидите `ALTER TABLE` - всё готово!

Затем выйдите:
```sql
\q
```

---

## Проверка успешной миграции

Выполните команду для проверки структуры таблицы:

```sql
\d sellers
```

Или через SQL:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name IN ('rejection_reason', 'rejection_advice');
```

Должны увидеть оба поля: `rejection_reason` и `rejection_advice`.

---

## Если что-то пошло не так

Если появилась ошибка "column already exists" - это нормально, значит поля уже есть.

Если другая ошибка:
1. Убедитесь, что используете правильные данные подключения из Railway
2. Проверьте, что таблица `sellers` существует в базе данных
3. Убедитесь, что у вас есть права на изменение таблицы

