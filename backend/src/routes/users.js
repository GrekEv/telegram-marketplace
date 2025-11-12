import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить ID администратора для поддержки
router.get('/support-admin', authenticate, async (req, res) => {
  try {
    // Получаем первого доступного суперадмина, а если нет - то админа
    const result = await db.query(
      `SELECT id FROM users 
       WHERE role IN ('admin', 'superadmin') AND is_active = true
       ORDER BY 
         CASE WHEN role = 'superadmin' THEN 1 ELSE 2 END,
         created_at ASC
       LIMIT 1`,
      []
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Администратор не найден' });
    }

    res.json({ admin_id: result.rows[0].id });
  } catch (error) {
    console.error('Ошибка получения админа поддержки:', error);
    res.status(500).json({ error: 'Ошибка получения админа поддержки' });
  }
});

// Получить список магазинов, на которые подписан пользователь
router.get('/subscriptions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
        s.*,
        u.username,
        u.first_name,
        u.last_name,
        u.photo_url,
        COUNT(DISTINCT p.id) as products_count,
        COUNT(DISTINCT sub2.id) as subscribers_count
       FROM subscriptions sub
       INNER JOIN sellers s ON sub.seller_id = s.id
       INNER JOIN users u ON s.user_id = u.id
       LEFT JOIN products p ON p.seller_id = s.id AND p.status = 'approved'
       LEFT JOIN subscriptions sub2 ON sub2.seller_id = s.id
       WHERE sub.user_id = $1 AND s.status = 'approved'
       GROUP BY s.id, u.id
       ORDER BY sub.created_at DESC`,
      [userId]
    );

    res.json({ sellers: result.rows });
  } catch (error) {
    console.error('Ошибка получения подписок:', error);
    res.status(500).json({ error: 'Ошибка получения подписок' });
  }
});

// Получить ленту товаров (доступна всем, авторизация опциональна)
router.get('/feed', async (req, res) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    
    // Проверяем, авторизован ли пользователь (опционально)
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Токен невалидный, но это не критично - просто показываем общую ленту
      }
    }

    let whereConditions = ['p.status = $1', 's.status = $2'];
    const params = ['approved', 'approved'];
    let paramIndex = 3;

    if (category) {
      if (category === 'promoted') {
        whereConditions.push('p.is_promoted = true');
        whereConditions.push('p.promotion_until > NOW()');
      } else if (category === 'subscription' && userId) {
        whereConditions.push('sub.id IS NOT NULL');
      } else if (category === 'popular') {
        whereConditions.push('p.purchases_count > 10');
      }
    }

    // Если категория subscription, но нет userId - возвращаем пустой массив
    if (category === 'subscription' && !userId) {
      return res.json({
        products: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    const query = `
      SELECT 
        p.*,
        s.shop_name,
        s.logo_url as seller_logo,
        u.username as seller_username,
        COUNT(DISTINCT pl.id) as likes_count
        ${userId ? ', CASE WHEN sub.id IS NOT NULL THEN true ELSE false END as is_subscribed' : ', false as is_subscribed'}
      FROM products p
      INNER JOIN sellers s ON p.seller_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN product_likes pl ON p.id = pl.product_id
      ${userId ? `LEFT JOIN subscriptions sub ON sub.user_id = $${paramIndex} AND sub.seller_id = s.id` : ''}
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY p.id, s.id, u.id, s.shop_name, s.logo_url, u.username${userId ? ', sub.id' : ''}
      ORDER BY 
        CASE 
          WHEN p.is_promoted = true AND p.promotion_until > NOW() THEN 1
          ${userId ? 'WHEN sub.id IS NOT NULL THEN 2' : ''}
          WHEN p.purchases_count > 10 THEN 3
          ELSE 4
        END,
        p.created_at DESC
      LIMIT $${userId ? paramIndex + 1 : paramIndex} OFFSET $${userId ? paramIndex + 2 : paramIndex + 1}
    `;

    if (userId) {
      params.push(userId);
    }
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