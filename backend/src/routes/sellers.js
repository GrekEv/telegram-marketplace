import express from 'express';
import db from '../database/connection.js';
import { authenticate, requireSeller } from '../middleware/auth.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки файлов
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
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
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

// Заявка на создание магазина
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { shop_name, description } = req.body;

    if (!shop_name) {
      return res.status(400).json({ error: 'Название магазина обязательно' });
    }

    // Проверяем, не подал ли уже заявку
    const existing = await db.query(
      'SELECT id, status FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      const seller = existing.rows[0];
      if (seller.status === 'pending') {
        return res.status(400).json({ error: 'Заявка уже подана и ожидает модерации' });
      }
      if (seller.status === 'approved') {
        return res.status(400).json({ error: 'У вас уже есть магазин' });
      }
    }

    // Для админов и суперадминов автоматически одобряем магазин
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const initialStatus = isAdmin ? 'approved' : 'pending';

    // Создаем заявку
    const result = await db.query(
      `INSERT INTO sellers (user_id, shop_name, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, shop_name, description || null, initialStatus]
    );

    // Уведомляем всех админов о новой заявке (только если это не автодобрение)
    if (!isAdmin) {
      try {
        const adminsResult = await db.query(
          "SELECT id FROM users WHERE role IN ('admin', 'superadmin')"
        );

        for (const admin of adminsResult.rows) {
          try {
            await db.query(
              `INSERT INTO notifications (user_id, type, title, message, data)
               VALUES ($1, 'seller_application', 'Новая заявка на продавца', 
               'Новая заявка от пользователя: ' || $2 || '. Магазин: ' || $3, $4)`,
              [
                admin.id,
                req.user.username || req.user.first_name || 'Пользователь',
                shop_name,
                JSON.stringify({ seller_id: result.rows[0].id, user_id: req.user.id })
              ]
            );
          } catch (notifError) {
            console.error(`Ошибка отправки уведомления админу ${admin.id}:`, notifError);
            // Продолжаем для других админов
          }
        }
        console.log(`Уведомления отправлены ${adminsResult.rows.length} админам`);
      } catch (adminsError) {
        console.error('Ошибка получения списка админов для уведомлений:', adminsError);
        // Не прерываем выполнение, заявка уже создана
      }
    }

    res.json({
      message: isAdmin ? 'Магазин создан и одобрен автоматически' : 'Заявка подана на модерацию',
      seller: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка подачи заявки:', error);
    res.status(500).json({ 
      error: 'Ошибка подачи заявки',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Получить список всех магазинов (для всех пользователей, без авторизации)
router.get('/all', async (req, res) => {
  try {
    const { limit = 20, offset = 0, search = '', sort = 'rating' } = req.query;

    let query = `
      SELECT s.*, u.username, u.first_name, u.last_name, u.photo_url,
             COUNT(DISTINCT p.id) as products_count,
             COUNT(DISTINCT sub.id) as subscribers_count
      FROM sellers s
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON p.seller_id = s.id AND p.status = 'approved'
      LEFT JOIN subscriptions sub ON sub.seller_id = s.id
      WHERE s.status = 'approved'
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (s.shop_name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY s.id, u.id`;

    // Сортировка
    if (sort === 'rating') {
      query += ` ORDER BY s.rating DESC, s.total_sales DESC`;
    } else if (sort === 'sales') {
      query += ` ORDER BY s.total_sales DESC, s.rating DESC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY s.created_at DESC`;
    } else {
      query += ` ORDER BY s.rating DESC`;
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Получаем общее количество магазинов
    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total
      FROM sellers s
      WHERE s.status = 'approved'
    `;
    
    const countParams = [];
    if (search) {
      countQuery += ` AND (s.shop_name ILIKE $1 OR s.description ILIKE $1)`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      sellers: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения списка магазинов:', error);
    res.status(500).json({ error: 'Ошибка получения списка магазинов' });
  }
});

// Получить информацию о своем магазине
router.get('/my-shop', authenticate, requireSeller, async (req, res) => {
  try {
    const sellerResult = await db.query(
      'SELECT * FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    const seller = sellerResult.rows[0];

    // Получаем товары
    const productsResult = await db.query(
      'SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC',
      [seller.id]
    );

    // Получаем коллекции
    const collectionsResult = await db.query(
      'SELECT * FROM collections WHERE seller_id = $1 ORDER BY created_at DESC',
      [seller.id]
    );

    // Расширенная статистика
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_products,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_products,
        SUM(views_count) as total_views,
        SUM(purchases_count) as total_purchases,
        SUM(likes_count) as total_likes,
        SUM(shares_count) as total_shares
       FROM products
       WHERE seller_id = $1`,
      [seller.id]
    );

    // Статистика по заказам
    const ordersStats = await db.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN order_status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) as paid_orders,
        SUM(CASE WHEN payment_status = 'confirmed' THEN total_price ELSE 0 END) as total_revenue,
        AVG(CASE WHEN payment_status = 'confirmed' THEN total_price ELSE NULL END) as avg_order_value
       FROM orders
       WHERE seller_id = $1`,
      [seller.id]
    );

    // Статистика по подписчикам
    const subscribersStats = await db.query(
      `SELECT COUNT(*) as total_subscribers
       FROM subscriptions
       WHERE seller_id = $1`,
      [seller.id]
    );

    // Статистика по метрикам (просмотры, клики, конверсия)
    const metricsStats = await db.query(
      `SELECT 
        SUM(p.views_count) as total_views,
        SUM(p.likes_count) as total_likes,
        SUM(p.shares_count) as total_shares,
        SUM(p.purchases_count) as total_purchases,
        CASE 
          WHEN SUM(p.views_count) > 0 
          THEN ROUND(SUM(p.purchases_count) * 100.0 / SUM(p.views_count), 2)
          ELSE 0 
        END as conversion_rate
       FROM products p
       WHERE p.seller_id = $1 AND p.status = 'approved'`,
      [seller.id]
    );

    // Статистика по товарам (топ товары)
    const topProducts = await db.query(
      `SELECT id, name, views_count, likes_count, purchases_count
       FROM products
       WHERE seller_id = $1 AND status = 'approved'
       ORDER BY purchases_count DESC, views_count DESC
       LIMIT 5`,
      [seller.id]
    );

    res.json({
      seller,
      products: productsResult.rows,
      collections: collectionsResult.rows,
      stats: {
        ...statsResult.rows[0],
        ...ordersStats.rows[0],
        ...subscribersStats.rows[0],
        ...metricsStats.rows[0]
      },
      top_products: topProducts.rows
    });
  } catch (error) {
    console.error('Ошибка получения магазина:', error);
    res.status(500).json({ error: 'Ошибка получения магазина' });
  }
});

// Обновить настройки магазина
router.put('/my-shop', authenticate, requireSeller, upload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), async (req, res) => {
  try {
    const { shop_name, description, social_links, payment_methods, delivery_methods } = req.body;

    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    const sellerId = sellerResult.rows[0].id;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (shop_name) {
      updates.push(`shop_name = $${paramIndex}`);
      params.push(shop_name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (social_links) {
      updates.push(`social_links = $${paramIndex}`);
      params.push(JSON.stringify(social_links));
      paramIndex++;
    }

    if (payment_methods) {
      updates.push(`payment_methods = $${paramIndex}`);
      params.push(JSON.stringify(payment_methods));
      paramIndex++;
    }

    if (delivery_methods) {
      updates.push(`delivery_methods = $${paramIndex}`);
      params.push(JSON.stringify(delivery_methods));
      paramIndex++;
    }

    // Обработка загруженных файлов
    if (req.files) {
      const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
      
      if (req.files['banner']) {
        const bannerUrl = `${baseUrl}/${req.files['banner'][0].filename}`;
        updates.push(`banner_url = $${paramIndex}`);
        params.push(bannerUrl);
        paramIndex++;
      }

      if (req.files['logo']) {
        const logoUrl = `${baseUrl}/${req.files['logo'][0].filename}`;
        updates.push(`logo_url = $${paramIndex}`);
        params.push(logoUrl);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(sellerId);

    const result = await db.query(
      `UPDATE sellers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json({ seller: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления магазина:', error);
    res.status(500).json({ error: 'Ошибка обновления магазина' });
  }
});

// Обновить способы оплаты
router.put('/payment-methods', authenticate, requireSeller, async (req, res) => {
  try {
    const { payment_methods } = req.body;

    if (!payment_methods) {
      return res.status(400).json({ error: 'Способы оплаты обязательны' });
    }

    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Магазин не найден' });
    }

    const sellerId = sellerResult.rows[0].id;

    const result = await db.query(
      `UPDATE sellers 
       SET payment_methods = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify(payment_methods), sellerId]
    );

    res.json({ 
      message: 'Способы оплаты обновлены',
      payment_methods: result.rows[0].payment_methods
    });
  } catch (error) {
    console.error('Ошибка обновления способов оплаты:', error);
    res.status(500).json({ error: 'Ошибка обновления способов оплаты' });
  }
});

// Добавить товар
router.post('/products', authenticate, requireSeller, upload.array('images', 10), async (req, res) => {
  try {
    const { name, description, price, discount, currency, collection_id, tags, is_digital } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Название и цена товара обязательны' });
    }

    // Для админов и суперадминов разрешаем добавлять товары даже если магазин pending
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const statusCheck = isAdmin ? "status IN ('pending', 'approved')" : "status = 'approved'";
    
    const sellerResult = await db.query(
      `SELECT id FROM sellers WHERE user_id = $1 AND ${statusCheck}`,
      [req.user.id]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Магазин не найден или не одобрен' });
    }

    const sellerId = sellerResult.rows[0].id;

    // Обработка изображений
    const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
    const images = req.files ? req.files.map(file => `${baseUrl}/${file.filename}`) : [];

    // Парсим теги
    const tagsArray = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    // Для админов и суперадминов автоматически одобряем товар
    const productStatus = isAdmin ? 'approved' : 'pending';

    const result = await db.query(
      `INSERT INTO products (seller_id, collection_id, name, description, price, discount, currency, images, tags, is_digital, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        sellerId,
        collection_id || null,
        name,
        description || null,
        parseFloat(price),
        discount ? parseFloat(discount) : 0,
        currency || 'RUB',
        JSON.stringify(images),
        JSON.stringify(tagsArray),
        is_digital === 'true' || is_digital === true,
        productStatus
      ]
    );

    res.json({
      message: isAdmin ? 'Товар добавлен и одобрен автоматически' : 'Товар добавлен и ожидает модерации',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка добавления товара:', error);
    res.status(500).json({ error: 'Ошибка добавления товара' });
  }
});

// Добавить коллекцию
router.post('/collections', authenticate, requireSeller, upload.single('logo'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название коллекции обязательно' });
    }

    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Магазин не одобрен' });
    }

    const sellerId = sellerResult.rows[0].id;
    const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
    const logoUrl = req.file ? `${baseUrl}/${req.file.filename}` : null;

    const result = await db.query(
      `INSERT INTO collections (seller_id, name, description, logo_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sellerId, name, description || null, logoUrl]
    );

    res.json({ collection: result.rows[0] });
  } catch (error) {
    console.error('Ошибка добавления коллекции:', error);
    res.status(500).json({ error: 'Ошибка добавления коллекции' });
  }
});

export default router;

