import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Начинаем миграцию базы данных...');
    
    // Подключаемся к БД
    await db.connect();
    
    // Читаем SQL схему
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Выполняем SQL
    await db.query(schemaSQL);
    
    console.log('✅ Миграция выполнена успешно!');
    
    // Создаем первого суперадмина (если нужно)
    // Это можно сделать вручную через API или скрипт
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    process.exit(1);
  }
}

migrate();

