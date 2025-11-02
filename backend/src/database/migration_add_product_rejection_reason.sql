-- Миграция: добавление полей rejection_reason и rejection_advice в таблицу products
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejection_advice TEXT;

