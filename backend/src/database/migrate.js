import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  try {
    console.log('Начинаем миграцию базы данных...');
    
    // Подключаемся к БД
    await db.connect();
    
    // Читаем и выполняем SQL схему
    console.log('1. Создание схемы базы данных...');
    const schemaPath = join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schemaSQL);
    console.log('✅ Схема создана!');
    
    // Добавляем тестовые данные (основной магазин)
    console.log('2. Добавление первого тестового магазина...');
    const seedTestDataPath = join(__dirname, 'seed_test_data.sql');
    if (fs.existsSync(seedTestDataPath)) {
      const seedTestDataSQL = fs.readFileSync(seedTestDataPath, 'utf8');
      await db.query(seedTestDataSQL);
      console.log('✅ Первый тестовый магазин добавлен!');
    }
    
    // Добавляем дополнительные тестовые магазины
    console.log('3. Добавление дополнительных тестовых магазинов...');
    const seedMoreShopsPath = join(__dirname, 'seed_more_shops.sql');
    if (fs.existsSync(seedMoreShopsPath)) {
      const seedMoreShopsSQL = fs.readFileSync(seedMoreShopsPath, 'utf8');
      await db.query(seedMoreShopsSQL);
      console.log('✅ Дополнительные магазины добавлены!');
    }
    
    console.log('🎉 Миграция выполнена успешно!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    process.exit(1);
  }
}

migrate();

