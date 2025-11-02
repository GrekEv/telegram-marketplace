# Миграция: Добавление полей для профиля пользователя

## Выполнение миграции

Выполните SQL команды для добавления полей в таблицу `users`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
```

## Через Railway Dashboard:

1. Откройте https://railway.app/ → ваш проект → PostgreSQL
2. Перейдите в раздел Query (или Database → Query)
3. Скопируйте и выполните SQL выше
4. Нажмите Run/Execute

## Через терминал:

```bash
PGPASSWORD=JbAOkBXzrwVTEjXkzSjiNCxQjvdhpgDb psql -h maglev.proxy.rlwy.net -U postgres -p 15153 -d railway -f backend/src/database/migration_add_user_fields.sql
```

