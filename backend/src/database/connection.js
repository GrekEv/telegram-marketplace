import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Поддержка DATABASE_URL (стандарт для Railway, Heroku и других платформ)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Используем DATABASE_URL если он есть (Railway автоматически предоставляет его)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  // Иначе используем отдельные переменные
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const database = process.env.DB_NAME || 'telegram_marketplace';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  // Проверка обязательных переменных в production
  if (process.env.NODE_ENV === 'production') {
    if (!password) {
      console.error('❌ DB_PASSWORD не установлен в production!');
    }
    if (host === 'localhost') {
      console.warn('⚠️  DB_HOST использует localhost в production! Проверьте переменные окружения.');
    }
  }

  poolConfig = {
    host,
    port,
    database,
    user,
    password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

// Тест подключения
const connect = async () => {
  try {
    const client = await pool.connect();
    console.log('📦 Подключение к PostgreSQL успешно');
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error);
    throw error;
  }
};

// Выполнение запросов
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Выполнен запрос', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
    throw error;
  }
};

export default { pool, connect, query };

