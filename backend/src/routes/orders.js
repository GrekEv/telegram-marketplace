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

// Настройка multer для загрузки фото подтверждения оплаты
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
    cb(null, 'payment-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// Создать заказ
router.post('/', authenticate, async (req, res) => {
  try {
    const { product_id, quantity = 1, payment_method, delivery_method, delivery_address, notes } = req.body;

    if (!product_id || !payment_method) {
      return res.status(400).json({ error: 'ID товара и способ оплаты обязательны' });
    }

    // Получаем товар
    const productResult = await db.query(
      `SELECT p.*, s.id as seller_id 
       FROM products p
       INNER JOIN sellers s ON p.seller_id = s.id
       WHERE p.id = $1 AND p.status = 'approved'`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const product = productResult.rows[0];
    const sellerId = product.seller_id;
    const price = product.price - (product.price * (product.discount / 100));
    const totalPrice = price * quantity;

    // Создаем заказ
    const result = await db.query(
      `INSERT INTO orders (user_id, seller_id, product_id, quantity, total_price, payment_method, delivery_method, delivery_address, notes, payment_status, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'not_paid', 'new')
       RETURNING *`,
      [
        req.user.id,
        sellerId,
        product_id,
        quantity,
        totalPrice,
        payment_method,
        delivery_method || null,
        delivery_address || null,
        notes || null
      ]
    );

    // Создаем уведомление для продавца
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'order_update', 'Новый заказ', 'У вас новый заказ #' || $2, $3)`,
      [
        (await db.query('SELECT user_id FROM sellers WHERE id = $1', [sellerId])).rows[0].user_id,
        result.rows[0].id,
        JSON.stringify({ order_id: result.rows[0].id })
      ]
    );

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// Подтвердить оплату (для крипты/фиата)
router.post('/:orderId/confirm-payment', authenticate, upload.single('proof'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { transaction_hash } = req.body;

    // Проверяем, что заказ принадлежит пользователю
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'confirmed') {
      return res.status(400).json({ error: 'Оплата уже подтверждена' });
    }

    const baseUrl = process.env.CDN_URL || 'http://localhost:3000/uploads';
    const proofUrl = req.file ? `${baseUrl}/${req.file.filename}` : null;

    // Обновляем статус оплаты
    const result = await db.query(
      `UPDATE orders 
       SET payment_status = 'paid', 
           payment_proof = $1, 
           transaction_hash = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [proofUrl, transaction_hash || null, orderId]
    );

    // Уведомляем продавца
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'order_update', 'Оплата заказа', 'Получена оплата за заказ #' || $2, $3)`,
      [
        (await db.query('SELECT user_id FROM sellers WHERE id = $1', [order.seller_id])).rows[0].user_id,
        orderId,
        JSON.stringify({ order_id: orderId, payment_status: 'paid' })
      ]
    );

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Ошибка подтверждения оплаты:', error);
    res.status(500).json({ error: 'Ошибка подтверждения оплаты' });
  }
});

// Получить мои заказы (для покупателя)
router.get('/my-orders', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, p.name as product_name, p.images, s.shop_name
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN sellers s ON o.seller_id = s.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Получить заказы магазина (для продавца)
router.get('/shop-orders', authenticate, async (req, res) => {
  try {
    // Проверяем, что у пользователя есть магазин
    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Требуется статус продавца' });
    }

    const sellerId = sellerResult.rows[0].id;

    const result = await db.query(
      `SELECT o.*, p.name as product_name, p.images,
        u.username, u.first_name, u.last_name
       FROM orders o
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.seller_id = $1
       ORDER BY o.created_at DESC`,
      [sellerId]
    );

    res.json({ orders: result.rows });
  } catch (error) {
    console.error('Ошибка получения заказов магазина:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Обновить статус заказа (для продавца)
router.put('/:orderId/status', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status, payment_status } = req.body;

    // Проверяем права продавца
    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1 AND status = $2',
      [req.user.id, 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Требуется статус продавца' });
    }

    const sellerId = sellerResult.rows[0].id;

    // Проверяем, что заказ принадлежит продавцу
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND seller_id = $2',
      [orderId, sellerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (order_status) {
      updates.push(`order_status = $${paramIndex}`);
      params.push(order_status);
      paramIndex++;
    }

    if (payment_status) {
      updates.push(`payment_status = $${paramIndex}`);
      params.push(payment_status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(orderId);

    const result = await db.query(
      `UPDATE orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // Если заказ доставлен, обновляем статистику продавца и уровень
    if (order_status === 'delivered') {
      await db.query(
        `UPDATE sellers 
         SET total_sales = total_sales + 1
         WHERE id = $1`,
        [sellerId]
      );
      
      // Обновляем уровень продавца
      const { updateSellerLevel } = await import('../utils/sellerLevel.js');
      await updateSellerLevel(sellerId);
      
      // Уведомление пользователю о завершении сделки (для запроса отзыва)
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'review_request', 'Завершение сделки', 
         'Как прошла сделка? Оставьте отзыв о товаре!', $2)`,
        [
          orderResult.rows[0].user_id,
          JSON.stringify({ order_id: orderId, product_id: orderResult.rows[0].product_id })
        ]
      );
    }

    // Уведомляем покупателя об изменении статуса
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'order_update', 'Обновление заказа', 'Статус заказа #' || $2 изменен', $3)`,
      [
        orderResult.rows[0].user_id,
        orderId,
        JSON.stringify({ order_id: orderId, order_status, payment_status })
      ]
    );

    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

export default router;

