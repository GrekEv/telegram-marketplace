import express from 'express';
import db from '../database/connection.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Все маршруты требуют роли admin или superadmin
router.use(authenticate);
router.use(requireRole('admin', 'superadmin'));

// Получить детали заявки продавца
router.get('/sellers/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const result = await db.query(
      `SELECT s.*, 
         u.username, u.first_name, u.last_name, u.telegram_id, u.photo_url, u.created_at as user_created_at
       FROM sellers s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sellerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ seller: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения заявки:', error);
    res.status(500).json({ error: 'Ошибка получения заявки' });
  }
});

// Одобрить/отклонить заявку продавца
router.post('/sellers/:sellerId/approve', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { action, rejection_reason, rejection_advice } = req.body; // 'approve' или 'reject'

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({ error: 'Причина отказа обязательна' });
    }

    let updateQuery = `UPDATE sellers 
       SET status = $1, updated_at = CURRENT_TIMESTAMP`;
    const params = [action === 'approve' ? 'approved' : 'rejected'];
    
    if (action === 'reject') {
      updateQuery += `, rejection_reason = $${params.length + 1}, rejection_advice = $${params.length + 2}`;
      params.push(rejection_reason || null);
      params.push(rejection_advice || null);
    } else {
      // При одобрении очищаем причину отказа
      updateQuery += `, rejection_reason = NULL, rejection_advice = NULL`;
    }
    
    updateQuery += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(sellerId);

    const result = await db.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Продавец не найден' });
    }

    // Обновляем роль пользователя, если одобрено
    if (action === 'approve') {
      await db.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['seller', result.rows[0].user_id]
      );
    }

    // Формируем сообщение для продавца
    let messageText = action === 'approve' 
      ? 'Ваша заявка на создание магазина одобрена!'
      : 'Ваша заявка на создание магазина отклонена.';
    
    if (action === 'reject' && rejection_reason) {
      messageText += `\n\nПричина: ${rejection_reason}`;
      if (rejection_advice) {
        messageText += `\n\nСоветы по исправлению:\n${rejection_advice}`;
      }
    }

    // Уведомляем продавца - важно, чтобы это всегда выполнялось
    try {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'seller_application', 
         $2, 
         $3,
         $4)`,
        [
          result.rows[0].user_id,
          action === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена',
          messageText,
          JSON.stringify({ 
            seller_id: sellerId, 
            status: result.rows[0].status,
            rejection_reason: rejection_reason || null,
            rejection_advice: rejection_advice || null
          })
        ]
      );
      console.log(`Уведомление отправлено пользователю ${result.rows[0].user_id}`);
    } catch (notifError) {
      console.error('Ошибка создания уведомления:', notifError);
      // Не прерываем выполнение, но логируем ошибку
    }

    // Аудит лог (не критично, если не запишется)
    try {
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'seller', $3, $4)`,
        [
          req.user.id,
          action === 'approve' ? 'seller_approved' : 'seller_rejected',
          sellerId,
          JSON.stringify({ 
            status: result.rows[0].status,
            rejection_reason: rejection_reason || null,
            rejection_advice: rejection_advice || null
          })
        ]
      );
    } catch (auditError) {
      console.error('Ошибка записи аудит лога:', auditError);
      // Не критично, продолжаем выполнение
    }

    res.json({ 
      seller: result.rows[0],
      message: action === 'approve' 
        ? 'Заявка одобрена, продавец получил уведомление' 
        : 'Заявка отклонена, продавец получил уведомление'
    });
  } catch (error) {
    console.error('Ошибка обработки заявки:', error);
    res.status(500).json({ 
      error: 'Ошибка обработки заявки',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Одобрить/отклонить товар
router.post('/products/:productId/moderate', async (req, res) => {
  try {
    const { productId } = req.params;
    const { action } = req.body; // 'approve' или 'reject'

    const result = await db.query(
      `UPDATE products 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [action === 'approve' ? 'approved' : 'rejected', productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, 'product', $3, $4)`,
      [
        req.user.id,
        action === 'approve' ? 'product_approved' : 'product_rejected',
        productId,
        JSON.stringify({ status: result.rows[0].status })
      ]
    );

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Ошибка модерации товара:', error);
    res.status(500).json({ error: 'Ошибка модерации товара' });
  }
});

// Получить список заявок на магазины
router.get('/sellers/pending', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.username, u.first_name, u.last_name, u.telegram_id
       FROM sellers s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    res.json({ sellers: result.rows });
  } catch (error) {
    console.error('Ошибка получения заявок:', error);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

// Получить список товаров на модерации
router.get('/products/pending', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, s.shop_name, u.username
       FROM products p
       INNER JOIN sellers s ON p.seller_id = s.id
       INNER JOIN users u ON s.user_id = u.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );

    res.json({ products: result.rows });
  } catch (error) {
    console.error('Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// Получить статистику
router.get('/stats', async (req, res) => {
  try {
    // Общая статистика
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['user']);
    const sellersCount = await db.query('SELECT COUNT(*) as count FROM sellers WHERE status = $1', ['approved']);
    const productsCount = await db.query('SELECT COUNT(*) as count FROM products WHERE status = $1', ['approved']);
    const ordersCount = await db.query('SELECT COUNT(*) as count FROM orders');

    // Статистика по оплатам
    const paymentsStats = await db.query(
      `SELECT payment_method, COUNT(*) as count, SUM(total_price) as total
       FROM orders
       WHERE payment_status = 'confirmed'
       GROUP BY payment_method`
    );

    // Статистика по категориям и конверсии
    const conversionStats = await db.query(
      `SELECT 
        COUNT(DISTINCT p.id) as total_products_viewed,
        COUNT(DISTINCT o.product_id) as products_purchased,
        COUNT(DISTINCT p.seller_id) as active_sellers,
        AVG(o.total_price) as avg_order_price,
        SUM(CASE WHEN o.payment_status = 'confirmed' THEN o.total_price ELSE 0 END) as total_revenue
       FROM products p
       LEFT JOIN orders o ON p.id = o.product_id
       WHERE p.status = 'approved'`
    );

    // Статистика по статусам товаров
    const productsByStatus = await db.query(
      `SELECT status, COUNT(*) as count
       FROM products
       GROUP BY status`
    );

    // Статистика по статусам продавцов
    const sellersByStatus = await db.query(
      `SELECT status, COUNT(*) as count
       FROM sellers
       GROUP BY status`
    );

    // Активность за последние 30 дней
    const activity30Days = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users,
        (SELECT COUNT(*) FROM sellers WHERE created_at >= NOW() - INTERVAL '30 days') as new_sellers,
        (SELECT COUNT(*) FROM products WHERE created_at >= NOW() - INTERVAL '30 days') as new_products,
        (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '30 days') as new_orders
       FROM users
       WHERE role = 'user' AND created_at >= NOW() - INTERVAL '30 days'`
    );

    // Топ продавцов
    const topSellers = await db.query(
      `SELECT s.id, s.shop_name, s.total_sales, s.rating, s.total_reviews, u.username
       FROM sellers s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.status = 'approved'
       ORDER BY s.total_sales DESC, s.rating DESC
       LIMIT 10`
    );

    // Распределение по методам оплаты
    const paymentDistribution = await db.query(
      `SELECT 
        payment_method,
        COUNT(*) as order_count,
        SUM(total_price) as total_amount,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM orders WHERE payment_status = 'confirmed'), 2) as percentage
       FROM orders
       WHERE payment_status = 'confirmed'
       GROUP BY payment_method`
    );

    res.json({
      overview: {
        users: parseInt(usersCount.rows[0].count),
        sellers: parseInt(sellersCount.rows[0].count),
        products: parseInt(productsCount.rows[0].count),
        orders: parseInt(ordersCount.rows[0].count)
      },
      payments: paymentsStats.rows,
      conversion: conversionStats.rows[0],
      products_by_status: productsByStatus.rows,
      sellers_by_status: sellersByStatus.rows,
      activity_30_days: activity30Days.rows[0],
      top_sellers: topSellers.rows,
      payment_distribution: paymentDistribution.rows
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Получить аудит логи (только для суперадмина)
router.get('/audit-logs', requireRole('superadmin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, admin_id } = req.query;

    let query = `
      SELECT al.*, u.username as admin_username
      FROM audit_logs al
      INNER JOIN users u ON al.admin_id = u.id
    `;

    const params = [];
    if (admin_id) {
      query += ` WHERE al.admin_id = $1`;
      params.push(admin_id);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Ошибка получения аудит логов:', error);
    res.status(500).json({ error: 'Ошибка получения аудит логов' });
  }
});

// Получить жалобы
router.get('/reports', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT r.*, 
        u1.username as reporter_username,
        u1.first_name as reporter_first_name,
        u2.username as reported_username,
        u2.first_name as reported_first_name,
        p.name as product_name,
        c.text as comment_text
      FROM reports r
      LEFT JOIN users u1 ON r.reporter_id = u1.id
      LEFT JOIN users u2 ON r.reported_user_id = u2.id
      LEFT JOIN products p ON r.reported_product_id = p.id
      LEFT JOIN comments c ON r.reported_comment_id = c.id
    `;

    const params = [];
    if (status) {
      query += ` WHERE r.status = $1`;
      params.push(status);
    } else {
      query += ` WHERE r.status = 'pending'`;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM reports ${status ? 'WHERE status = $1' : "WHERE status = 'pending'"}`,
      status ? [status] : []
    );

    res.json({
      reports: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения жалоб:', error);
    res.status(500).json({ error: 'Ошибка получения жалоб' });
  }
});

// Обработать жалобу
router.post('/reports/:reportId/resolve', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, admin_notes } = req.body; // action: 'resolved', 'dismissed'

    if (!action || !['resolved', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'Некорректное действие' });
    }

    const result = await db.query(
      `UPDATE reports 
       SET status = $1, admin_id = $2, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [action === 'resolved' ? 'resolved' : 'dismissed', req.user.id, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Жалоба не найдена' });
    }

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, 'report', $3, $4)`,
      [
        req.user.id,
        `report_${action}`,
        reportId,
        JSON.stringify({ status: result.rows[0].status, admin_notes })
      ]
    );

    res.json({ report: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обработки жалобы:', error);
    res.status(500).json({ error: 'Ошибка обработки жалобы' });
  }
});

// Заблокировать/разблокировать пользователя или магазин
router.post('/block', async (req, res) => {
  try {
    const { user_id, seller_id, action } = req.body; // action: 'block' или 'unblock'

    if (user_id) {
      await db.query(
        'UPDATE users SET is_active = $1 WHERE id = $2',
        [action === 'unblock', user_id]
      );
    }

    if (seller_id) {
      await db.query(
        'UPDATE sellers SET status = $1 WHERE id = $2',
        [action === 'unblock' ? 'approved' : 'blocked', seller_id]
      );
    }

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        action === 'block' ? 'entity_blocked' : 'entity_unblocked',
        user_id ? 'user' : 'seller',
        user_id || seller_id,
        JSON.stringify({ action })
      ]
    );

    res.json({ message: action === 'block' ? 'Заблокировано' : 'Разблокировано' });
  } catch (error) {
    console.error('Ошибка блокировки:', error);
    res.status(500).json({ error: 'Ошибка блокировки' });
  }
});

export default router;

