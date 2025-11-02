import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить информацию о товаре
router.get('/:productId', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Увеличиваем счетчик просмотров
    await db.query(
      'UPDATE products SET views_count = views_count + 1 WHERE id = $1',
      [productId]
    );

    // Получаем товар с информацией о продавце
    const result = await db.query(
      `SELECT 
        p.*,
        s.id as seller_id,
        s.shop_name,
        s.logo_url as seller_logo,
        s.description as seller_description,
        u.username as seller_username,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        COUNT(DISTINCT pl.id) as likes_count,
        p.shares_count,
        CASE WHEN pl_user.id IS NOT NULL THEN true ELSE false END as is_liked,
        CASE WHEN sub.id IS NOT NULL THEN true ELSE false END as is_subscribed
      FROM products p
      INNER JOIN sellers s ON p.seller_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN product_likes pl ON p.id = pl.product_id
      LEFT JOIN product_likes pl_user ON p.id = pl_user.product_id AND pl_user.user_id = $1
      LEFT JOIN subscriptions sub ON sub.user_id = $1 AND sub.seller_id = s.id
      WHERE p.id = $2 AND p.status = 'approved'
      GROUP BY p.id, s.id, u.id, pl_user.id, sub.id`,
      [userId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Получаем отзывы
    const reviewsResult = await db.query(
      `SELECT r.*, u.username, u.first_name, u.last_name, u.photo_url
       FROM reviews r
       INNER JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [productId]
    );

    // Получаем комментарии
    const commentsResult = await db.query(
      `SELECT c.*, u.username, u.first_name, u.last_name, u.photo_url
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.product_id = $1 AND c.parent_comment_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [productId]
    );

    res.json({
      product: result.rows[0],
      reviews: reviewsResult.rows,
      comments: commentsResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

// Получить профиль продавца (магазина)
router.get('/seller/:sellerId', authenticate, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;

    // Получаем информацию о продавце
    const sellerResult = await db.query(
      `SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url,
        COUNT(DISTINCT sub.id) as subscribers_count
       FROM sellers s
       INNER JOIN users u ON s.user_id = u.id
       LEFT JOIN subscriptions sub ON sub.seller_id = s.id
       WHERE s.id = $1 AND s.status = 'approved'
       GROUP BY s.id, u.id`,
      [sellerId]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Продавец не найден' });
    }

    // Проверяем подписку
    const subscriptionResult = await db.query(
      'SELECT id FROM subscriptions WHERE user_id = $1 AND seller_id = $2',
      [userId, sellerId]
    );

    // Получаем товары продавца
    const productsResult = await db.query(
      `SELECT p.*, COUNT(DISTINCT pl.id) as likes_count
       FROM products p
       LEFT JOIN product_likes pl ON p.id = pl.product_id
       WHERE p.seller_id = $1 AND p.status = 'approved'
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [sellerId]
    );

    // Получаем коллекции
    const collectionsResult = await db.query(
      'SELECT * FROM collections WHERE seller_id = $1 ORDER BY created_at DESC',
      [sellerId]
    );

    res.json({
      seller: sellerResult.rows[0],
      is_subscribed: subscriptionResult.rows.length > 0,
      products: productsResult.rows,
      collections: collectionsResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения профиля продавца:', error);
    res.status(500).json({ error: 'Ошибка получения профиля продавца' });
  }
});

// Поделиться товаром (увеличить счетчик)
router.post('/:productId/share', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;

    await db.query(
      'UPDATE products SET shares_count = shares_count + 1 WHERE id = $1',
      [productId]
    );

    const result = await db.query(
      'SELECT shares_count FROM products WHERE id = $1',
      [productId]
    );

    res.json({ shares_count: result.rows[0].shares_count });
  } catch (error) {
    console.error('Ошибка обновления счетчика репостов:', error);
    res.status(500).json({ error: 'Ошибка обновления счетчика репостов' });
  }
});

export default router;

