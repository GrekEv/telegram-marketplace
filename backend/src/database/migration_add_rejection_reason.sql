-- Миграция: добавление поля rejection_reason в таблицу sellers
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS rejection_advice TEXT;

