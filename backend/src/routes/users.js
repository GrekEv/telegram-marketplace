import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить ленту товаров
router.get('/feed', authenticate, async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    // Получаем историю поиска пользователя для рекомендаций
    const searchHistoryResult = await db.query(
      `SELECT DISTINCT query, filters FROM search_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    const userSearchTerms = searchHistoryResult.rows.map(sh => sh.query?.toLowerCase()).filter(Boolean);
    const userFilters = searchHistoryResult.rows
      .map(sh => sh.filters ? (typeof sh.filters === 'string' ? JSON.parse(sh.filters) : sh.filters) : {})
      .reduce((acc, f) => {
        if (f.category) acc.categories = (acc.categories || []).concat(f.category);
        if (f.shop_name) acc.shop_names = (acc.shop_names || []).concat(f.shop_name);
        return acc;
      }, { categories: [], shop_names: [] });

    let query = `
      SELECT DISTINCT
        p.*,
        s.shop_name,
        s.logo_url as seller_logo,
        u.username as seller_username,
        COUNT(DISTINCT pl.id) as likes_count,
        COUNT(DISTINCT sub.id) as is_subscribed,
        CASE 
          WHEN p.is_promoted = true AND p.promotion_until > NOW() THEN 'promoted'
          WHEN sub.id IS NOT NULL THEN 'subscription'
          WHEN p.purchases_count > 10 OR p.likes_count > 50 THEN 'popular'
          ELSE 'recommended'
        END as feed_category,
        CASE
          WHEN p.is_promoted = true AND p.promotion_until > NOW() THEN 1000
          WHEN sub.id IS NOT NULL THEN 800
          WHEN p.purchases_count > 20 THEN 600
          WHEN p.rating > 4.5 THEN 500
          WHEN p.likes_count > 100 THEN 400
          ELSE 100
        END + COALESCE((SELECT COUNT(*) * 50 FROM reviews r WHERE r.product_id = p.id AND r.rating >= 4), 0) as relevance_score
      FROM products p
      INNER JOIN sellers s ON p.seller_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN product_likes pl ON p.id = pl.product_id
      LEFT JOIN subscriptions sub ON sub.user_id = $1 AND sub.seller_id = s.id
      LEFT JOIN reviews rv ON rv.product_id = p.id
      WHERE p.status = 'approved' AND s.status = 'approved'
    `;

    const params = [userId];
    let paramIndex = 2;

    if (category) {
      if (category === 'promoted') {
        query += ` AND p.is_promoted = true AND p.promotion_until > NOW()`;
      } else if (category === 'subscription') {
        query += ` AND sub.id IS NOT NULL`;
      } else if (category === 'popular') {
        query += ` AND p.purchases_count > 10`;
      }
    }

    query += ` GROUP BY p.id, s.id, u.id, sub.id
      ORDER BY 
        CASE feed_category
          WHEN 'promoted' THEN 1
          WHEN 'subscription' THEN 2
          WHEN 'popular' THEN 3
          ELSE 4
        END,
        relevance_score DESC,
        p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({
      products: result.rows,
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения ленты:', error);
    res.status(500).json({ error: 'Ошибка получения ленты' });
  }
});

// Поиск товаров и продавцов
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, type, filters } = req.query;
    const userId = req.user.id;

    // Сохраняем поисковый запрос
    if (q) {
      await db.query(
        'INSERT INTO search_history (user_id, query, filters) VALUES ($1, $2, $3)',
        [userId, q, JSON.stringify(filters || {})]
      );
    }

    let results = { products: [], sellers: [] };

    if (!type || type === 'products' || type === 'all') {
      let productQuery = `
        SELECT p.*, s.shop_name, s.logo_url as seller_logo, u.username as seller_username
        FROM products p
        INNER JOIN sellers s ON p.seller_id = s.id
        INNER JOIN users u ON s.user_id = u.id
        WHERE p.status = 'approved' AND s.status = 'approved'
      `;

      const productParams = [];
      let paramIndex = 1;

      if (q) {
        productQuery += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        productParams.push(`%${q}%`);
        paramIndex++;
      }

      if (filters) {
        const filtersObj = typeof filters === 'string' ? JSON.parse(filters) : filters;
        
        if (filtersObj.shop_name) {
          productQuery += ` AND s.shop_name ILIKE $${paramIndex}`;
          productParams.push(`%${filtersObj.shop_name}%`);
          paramIndex++;
        }
        if (filtersObj.category) {
          productQuery += ` AND $${paramIndex} = ANY(p.tags)`;
          productParams.push(filtersObj.category);
          paramIndex++;
        }
      }

      productQuery += ` ORDER BY p.created_at DESC LIMIT 50`;
      
      const productResult = await db.query(productQuery, productParams);
      results.products = productResult.rows;
    }

    if (!type || type === 'sellers' || type === 'all') {
      let sellerQuery = `
        SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url,
               COUNT(DISTINCT p.id) as products_count
        FROM sellers s
        INNER JOIN users u ON s.user_id = u.id
        LEFT JOIN products p ON p.seller_id = s.id AND p.status = 'approved'
        WHERE s.status = 'approved'
      `;

      const sellerParams = [];
      let paramIndex = 1;

      if (q) {
        sellerQuery += ` AND (s.shop_name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
        sellerParams.push(`%${q}%`);
        paramIndex++;
      }

      sellerQuery += ` GROUP BY s.id, u.id ORDER BY s.total_sales DESC, s.rating DESC LIMIT 20`;
      
      const sellerResult = await db.query(sellerQuery, sellerParams);
      results.sellers = sellerResult.rows;
    }

    res.json(results);
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// Подписаться/отписаться от продавца
router.post('/subscribe/:sellerId', authenticate, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const userId = req.user.id;

    // Проверяем существование продавца
    const sellerResult = await db.query('SELECT id FROM sellers WHERE id = $1', [sellerId]);
    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Продавец не найден' });
    }

    // Проверяем, подписан ли уже
    const existing = await db.query(
      'SELECT id FROM subscriptions WHERE user_id = $1 AND seller_id = $2',
      [userId, sellerId]
    );

    if (existing.rows.length > 0) {
      // Отписываемся
      await db.query(
        'DELETE FROM subscriptions WHERE user_id = $1 AND seller_id = $2',
        [userId, sellerId]
      );
      res.json({ subscribed: false });
    } else {
      // Подписываемся
      await db.query(
        'INSERT INTO subscriptions (user_id, seller_id) VALUES ($1, $2)',
        [userId, sellerId]
      );
      res.json({ subscribed: true });
    }
  } catch (error) {
    console.error('Ошибка подписки:', error);
    res.status(500).json({ error: 'Ошибка подписки' });
  }
});

// Лайкнуть/снять лайк с товара
router.post('/products/:productId/like', authenticate, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Проверяем существование товара
    const productResult = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Проверяем, лайкнут ли уже
    const existing = await db.query(
      'SELECT id FROM product_likes WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      // Убираем лайк
      await db.query(
        'DELETE FROM product_likes WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );
      await db.query(
        'UPDATE products SET likes_count = likes_count - 1 WHERE id = $1',
        [productId]
      );
      res.json({ liked: false });
    } else {
      // Ставим лайк
      await db.query(
        'INSERT INTO product_likes (user_id, product_id) VALUES ($1, $2)',
        [userId, productId]
      );
      await db.query(
        'UPDATE products SET likes_count = likes_count + 1 WHERE id = $1',
        [productId]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Ошибка лайка:', error);
    res.status(500).json({ error: 'Ошибка лайка' });
  }
});

export default router;

