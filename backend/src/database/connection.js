import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'telegram_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

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

