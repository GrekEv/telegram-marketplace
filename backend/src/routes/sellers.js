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

    // Создаем заявку
    const result = await db.query(
      `INSERT INTO sellers (user_id, shop_name, description, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, shop_name, description || null]
    );

    // Уведомляем всех админов о новой заявке
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

    res.json({
      message: 'Заявка подана на модерацию',
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

    // Статистика
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_products,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_products,
        SUM(views_count) as total_views,
        SUM(purchases_count) as total_purchases
       FROM products
       WHERE seller_id = $1`,
      [seller.id]
    );

    res.json({
      seller,
      products: productsResult.rows,
      collections: collectionsResult.rows,
      stats: statsResult.rows[0]
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

// Добавить товар
router.post('/products', authenticate, requireSeller, upload.array('images', 10), async (req, res) => {
  try {
    const { name, description, price, discount, currency, collection_id, tags, is_digital } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Название и цена товара обязательны' });
    }

    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Магазин не одобрен' });
    }

    const sellerId = sellerResult.rows[0].id;

    // Обработка изображений
    const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
    const images = req.files ? req.files.map(file => `${baseUrl}/${file.filename}`) : [];

    // Парсим теги
    const tagsArray = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    const result = await db.query(
      `INSERT INTO products (seller_id, collection_id, name, description, price, discount, currency, images, tags, is_digital, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
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
        is_digital === 'true' || is_digital === true
      ]
    );

    res.json({
      message: 'Товар добавлен и ожидает модерации',
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

