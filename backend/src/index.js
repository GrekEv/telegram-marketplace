import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './database/connection.js';

// Импорт маршрутов
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import sellerRoutes from './routes/sellers.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import reviewRoutes from './routes/reviews.js';
import commentRoutes from './routes/comments.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import promotionRoutes from './routes/promotions.js';
import referralRoutes from './routes/referrals.js';
import aiRoutes from './routes/ai.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы для загрузок
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Проверка подключения к БД
db.connect()
  .then(() => {
    console.log('✅ Подключение к базе данных установлено');
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к БД:', err);
    process.exit(1);
  });

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступно по адресу http://localhost:${PORT}/api`);
});

