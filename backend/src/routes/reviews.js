import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки фото отзывов
const uploadDir = join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения'));
    }
  }
});

// Создать отзыв (только после покупки)
router.post('/', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const { product_id, order_id, rating, text } = req.body;
    const userId = req.user.id;

    if (!product_id || !rating) {
      return res.status(400).json({ error: 'ID товара и рейтинг обязательны' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
    }

    // Проверяем, что пользователь действительно покупал товар
    const orderResult = await db.query(
      `SELECT id, payment_status FROM orders 
       WHERE user_id = $1 AND product_id = $2 AND payment_status = 'confirmed'`,
      [userId, product_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Можно оставить отзыв только после подтвержденной покупки' });
    }

    // Проверяем, не оставлял ли уже отзыв
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2',
      [userId, product_id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот товар' });
    }

    // Обработка изображений
    const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
    const images = req.files ? req.files.map(file => `${baseUrl}/${file.filename}`) : [];

    // Создаем отзыв
    const result = await db.query(
      `INSERT INTO reviews (user_id, product_id, order_id, rating, text, images, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        userId,
        product_id,
        order_id || orderResult.rows[0].id,
        rating,
        text || null,
        JSON.stringify(images)
      ]
    );

    // Обновляем статистику товара и продавца
    await db.query(
      `UPDATE products SET total_reviews = total_reviews + 1 WHERE id = $1`,
      [product_id]
    );

    // Обновляем рейтинг продавца
    const sellerIdResult = await db.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [product_id]
    );

    if (sellerIdResult.rows.length > 0) {
      const sellerId = sellerIdResult.rows[0].seller_id;
      
      // Пересчитываем средний рейтинг
      const avgRatingResult = await db.query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as count
         FROM reviews r
         INNER JOIN products p ON r.product_id = p.id
         WHERE p.seller_id = $1`,
        [sellerId]
      );

      if (avgRatingResult.rows[0].count > 0) {
        await db.query(
          `UPDATE sellers SET 
           rating = $1,
           total_reviews = (SELECT COUNT(*) FROM reviews r INNER JOIN products p ON r.product_id = p.id WHERE p.seller_id = $2)
           WHERE id = $2`,
          [parseFloat(avgRatingResult.rows[0].avg_rating).toFixed(2), sellerId]
        );
        
        // Обновляем уровень продавца
        const { updateSellerLevel } = await import('../utils/sellerLevel.js');
        await updateSellerLevel(sellerId);
      }
    }

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания отзыва:', error);
    res.status(500).json({ error: 'Ошибка создания отзыва' });
  }
});

// Получить отзывы по товару
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT r.*, u.username, u.first_name, u.last_name, u.photo_url
       FROM reviews r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), parseInt(offset)]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = $1',
      [productId]
    );

    res.json({
      reviews: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения отзывов:', error);
    res.status(500).json({ error: 'Ошибка получения отзывов' });
  }
});

// Обновить свой отзыв
router.put('/:reviewId', authenticate, upload.array('images', 5), async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, text } = req.body;
    const userId = req.user.id;

    // Проверяем, что отзыв принадлежит пользователю
    const reviewResult = await db.query(
      'SELECT * FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден или нет доступа' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
      }
      updates.push(`rating = $${paramIndex}`);
      params.push(rating);
      paramIndex++;
    }

    if (text !== undefined) {
      updates.push(`text = $${paramIndex}`);
      params.push(text);
      paramIndex++;
    }

    // Обработка новых изображений (если загружены)
    if (req.files && req.files.length > 0) {
      const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
      const images = req.files.map(file => `${baseUrl}/${file.filename}`);
      updates.push(`images = $${paramIndex}`);
      params.push(JSON.stringify(images));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(reviewId);

    const result = await db.query(
      `UPDATE reviews SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления отзыва:', error);
    res.status(500).json({ error: 'Ошибка обновления отзыва' });
  }
});

// Удалить свой отзыв
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *',
      [reviewId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден или нет доступа' });
    }

    res.json({ message: 'Отзыв удален' });
  } catch (error) {
    console.error('Ошибка удаления отзыва:', error);
    res.status(500).json({ error: 'Ошибка удаления отзыва' });
  }
});

export default router;

