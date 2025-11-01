import express from 'express';
import db from '../database/connection.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const router = express.Router();

// Получить список доступных опций продвижения
router.get('/options', authenticate, async (req, res) => {
  try {
    // Опции продвижения (можно вынести в отдельную таблицу или настройки)
    const options = [
      {
        id: 'product_1m',
        name: 'Продвижение товара - 1 месяц',
        type: 'product',
        duration_months: 1,
        price: 500,
        description: 'Ваш товар будет выделен в ленте на 1 месяц'
      },
      {
        id: 'product_3m',
        name: 'Продвижение товара - 3 месяца',
        type: 'product',
        duration_months: 3,
        price: 1200,
        description: 'Ваш товар будет выделен в ленте на 3 месяца (скидка 20%)'
      },
      {
        id: 'product_6m',
        name: 'Продвижение товара - 6 месяцев',
        type: 'product',
        duration_months: 6,
        price: 2000,
        description: 'Ваш товар будет выделен в ленте на 6 месяцев (скидка 33%)'
      },
      {
        id: 'collection_1m',
        name: 'Продвижение коллекции - 1 месяц',
        type: 'collection',
        duration_months: 1,
        price: 800,
        description: 'Ваша коллекция будет продвигаться в ленте'
      },
      {
        id: 'shop_1m',
        name: 'Продвижение магазина - 1 месяц',
        type: 'shop',
        duration_months: 1,
        price: 1500,
        description: 'Все товары вашего магазина получат приоритет в ленте'
      }
    ];

    res.json({ options });
  } catch (error) {
    console.error('Ошибка получения опций продвижения:', error);
    res.status(500).json({ error: 'Ошибка получения опций' });
  }
});

// Создать заявку на продвижение
router.post('/', authenticate, requireSeller, async (req, res) => {
  try {
    const { option_id, product_id, collection_id, payment_method } = req.body;
    const userId = req.user.id;

    // Получаем информацию о продавце
    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1 AND status = $2',
      [userId, 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Магазин не одобрен' });
    }

    const sellerId = sellerResult.rows[0].id;

    // Получаем опции продвижения
    const options = {
      'product_1m': { duration: 1, price: 500 },
      'product_3m': { duration: 3, price: 1200 },
      'product_6m': { duration: 6, price: 2000 },
      'collection_1m': { duration: 1, price: 800 },
      'shop_1m': { duration: 1, price: 1500 }
    };

    const option = options[option_id];
    if (!option) {
      return res.status(400).json({ error: 'Неверная опция продвижения' });
    }

    // Определяем тип и объект продвижения
    let promotionType = 'shop';
    let targetId = null;

    if (option_id.includes('product')) {
      promotionType = 'product';
      if (!product_id) {
        // Проверяем, что товар принадлежит продавцу
        const productResult = await db.query(
          'SELECT id FROM products WHERE id = $1 AND seller_id = $2',
          [product_id, sellerId]
        );
        if (productResult.rows.length === 0) {
          return res.status(404).json({ error: 'Товар не найден' });
        }
        targetId = product_id;
      }
    } else if (option_id.includes('collection')) {
      promotionType = 'collection';
      if (!collection_id) {
        return res.status(400).json({ error: 'ID коллекции обязателен' });
      }
      const collectionResult = await db.query(
        'SELECT id FROM collections WHERE id = $1 AND seller_id = $2',
        [collection_id, sellerId]
      );
      if (collectionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Коллекция не найдена' });
      }
      targetId = collection_id;
    }

    // Создаем запись о продвижении
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + option.duration);

    const result = await db.query(
      `INSERT INTO promotions (seller_id, product_id, promotion_type, duration_months, price, payment_status, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, 'not_paid', 'pending', $6, $7)
       RETURNING *`,
      [
        sellerId,
        targetId,
        promotionType,
        option.duration,
        option.price,
        startDate,
        endDate
      ]
    );

    // Если это продвижение товара, устанавливаем флаг
    if (promotionType === 'product' && targetId) {
      await db.query(
        `UPDATE products SET is_promoted = true, promotion_until = $1 WHERE id = $2`,
        [endDate, targetId]
      );
    }

    res.json({
      promotion: result.rows[0],
      message: 'Заявка на продвижение создана. После оплаты продвижение будет активировано.'
    });
  } catch (error) {
    console.error('Ошибка создания продвижения:', error);
    res.status(500).json({ error: 'Ошибка создания продвижения' });
  }
});

// Подтвердить оплату продвижения
router.post('/:promotionId/confirm-payment', authenticate, requireSeller, async (req, res) => {
  try {
    const { promotionId } = req.params;
    const { payment_proof } = req.body;

    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    const promotionResult = await db.query(
      'SELECT * FROM promotions WHERE id = $1 AND seller_id = $2',
      [promotionId, sellerResult.rows[0].id]
    );

    if (promotionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Продвижение не найдено' });
    }

    const promotion = promotionResult.rows[0];

    // Обновляем статус оплаты (админ должен подтвердить)
    await db.query(
      `UPDATE promotions SET payment_status = 'paid', status = 'active', start_date = CURRENT_TIMESTAMP WHERE id = $1`,
      [promotionId]
    );

    // Активируем продвижение для товара
    if (promotion.promotion_type === 'product' && promotion.product_id) {
      await db.query(
        `UPDATE products SET is_promoted = true, promotion_until = $1 WHERE id = $2`,
        [promotion.end_date, promotion.product_id]
      );
    }

    res.json({ message: 'Оплата зафиксирована. Продвижение будет активировано после проверки администратором.' });
  } catch (error) {
    console.error('Ошибка подтверждения оплаты:', error);
    res.status(500).json({ error: 'Ошибка подтверждения оплаты' });
  }
});

// Получить активные продвижения продавца
router.get('/my-promotions', authenticate, requireSeller, async (req, res) => {
  try {
    const sellerResult = await db.query(
      'SELECT id FROM sellers WHERE user_id = $1',
      [req.user.id]
    );

    const result = await db.query(
      `SELECT p.*, pr.name as product_name
       FROM promotions p
       LEFT JOIN products pr ON p.product_id = pr.id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [sellerResult.rows[0].id]
    );

    res.json({ promotions: result.rows });
  } catch (error) {
    console.error('Ошибка получения продвижений:', error);
    res.status(500).json({ error: 'Ошибка получения продвижений' });
  }
});

export default router;

