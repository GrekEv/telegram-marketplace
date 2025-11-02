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
    const { action, rejection_reason, rejection_advice } = req.body; // 'approve' или 'reject'

    if (action === 'reject' && !rejection_reason) {
      return res.status(400).json({ error: 'Причина отказа обязательна' });
    }

    // Получаем информацию о товаре и продавце перед обновлением
    const productInfo = await db.query(
      `SELECT p.*, s.user_id as seller_user_id
       FROM products p
       INNER JOIN sellers s ON p.seller_id = s.id
       WHERE p.id = $1`,
      [productId]
    );

    if (productInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    let updateQuery = `UPDATE products 
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
    params.push(productId);

    const result = await db.query(updateQuery, params);

    // Формируем сообщение для продавца
    let messageText = action === 'approve' 
      ? `Ваш товар "${productInfo.rows[0].name}" одобрен и опубликован!`
      : `Ваш товар "${productInfo.rows[0].name}" отклонен.`;
    
    if (action === 'reject' && rejection_reason) {
      messageText += `\n\nПричина: ${rejection_reason}`;
      if (rejection_advice) {
        messageText += `\n\nСоветы по исправлению:\n${rejection_advice}`;
      }
    }

    // Уведомляем продавца
    try {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'product_moderation', 
         $2, 
         $3,
         $4)`,
        [
          productInfo.rows[0].seller_user_id,
          action === 'approve' ? 'Товар одобрен' : 'Товар отклонен',
          messageText,
          JSON.stringify({ 
            product_id: productId, 
            product_name: productInfo.rows[0].name,
            status: result.rows[0].status,
            rejection_reason: rejection_reason || null,
            rejection_advice: rejection_advice || null
          })
        ]
      );
      console.log(`Уведомление отправлено продавцу ${productInfo.rows[0].seller_user_id}`);
    } catch (notifError) {
      console.error('Ошибка создания уведомления:', notifError);
    }

    // Аудит лог
    try {
      await db.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
         VALUES ($1, $2, 'product', $3, $4)`,
        [
          req.user.id,
          action === 'approve' ? 'product_approved' : 'product_rejected',
          productId,
          JSON.stringify({ 
            status: result.rows[0].status,
            rejection_reason: rejection_reason || null,
            rejection_advice: rejection_advice || null
          })
        ]
      );
    } catch (auditError) {
      console.error('Ошибка записи аудит лога:', auditError);
    }

    res.json({ 
      product: result.rows[0],
      message: action === 'approve' 
        ? 'Товар одобрен, продавец получил уведомление' 
        : 'Товар отклонен, продавец получил уведомление'
    });
  } catch (error) {
    console.error('Ошибка модерации товара:', error);
    res.status(500).json({ 
      error: 'Ошибка модерации товара',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      `SELECT p.*, s.shop_name, s.user_id as seller_user_id, u.username, u.first_name, u.last_name
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

// Получить детали товара для модерации
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await db.query(
      `SELECT p.*, 
         s.shop_name, s.user_id as seller_user_id,
         u.username, u.first_name, u.last_name, u.telegram_id, u.photo_url
       FROM products p
       INNER JOIN sellers s ON p.seller_id = s.id
       INNER JOIN users u ON s.user_id = u.id
       WHERE p.id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    res.status(500).json({ error: 'Ошибка получения товара' });
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

// Выдать предупреждение пользователю
router.post('/warnings', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { user_id, type, reason, expires_at } = req.body; // type: 'warning', 'ban', 'suspension'

    if (!user_id || !type || !reason) {
      return res.status(400).json({ error: 'user_id, type и reason обязательны' });
    }

    const result = await db.query(
      `INSERT INTO warnings (user_id, admin_id, type, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        user_id,
        req.user.id,
        type,
        reason,
        expires_at || null
      ]
    );

    // Если это бан, блокируем пользователя
    if (type === 'ban') {
      await db.query('UPDATE users SET is_active = false WHERE id = $1', [user_id]);
    }

    // Уведомляем пользователя
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'warning', 'Предупреждение', $2, $3)`,
      [
        user_id,
        reason,
        JSON.stringify({ warning_id: result.rows[0].id, type, expires_at })
      ]
    );

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, 'user', $3, $4)`,
      [
        req.user.id,
        'warning_issued',
        user_id,
        JSON.stringify({ type, reason, expires_at })
      ]
    );

    res.json({ warning: result.rows[0] });
  } catch (error) {
    console.error('Ошибка выдачи предупреждения:', error);
    res.status(500).json({ error: 'Ошибка выдачи предупреждения' });
  }
});

// Удалить комментарий
router.delete('/comments/:commentId', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { commentId } = req.params;

    const commentResult = await db.query('SELECT * FROM comments WHERE id = $1', [commentId]);
    
    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'comment_deleted', 'comment', $2, $3)`,
      [
        req.user.id,
        commentId,
        JSON.stringify({ comment_text: commentResult.rows[0].text })
      ]
    );

    res.json({ message: 'Комментарий удален' });
  } catch (error) {
    console.error('Ошибка удаления комментария:', error);
    res.status(500).json({ error: 'Ошибка удаления комментария' });
  }
});

// Удалить отзыв
router.delete('/reviews/:reviewId', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { reviewId } = req.params;

    const reviewResult = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    // Пересчитываем рейтинг товара и продавца
    const productId = reviewResult.rows[0].product_id;
    const productResult = await db.query(
      'SELECT seller_id FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length > 0) {
      const sellerId = productResult.rows[0].seller_id;
      
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
           total_reviews = $2
           WHERE id = $3`,
          [
            parseFloat(avgRatingResult.rows[0].avg_rating).toFixed(2),
            parseInt(avgRatingResult.rows[0].count),
            sellerId
          ]
        );
      } else {
        await db.query('UPDATE sellers SET rating = 0, total_reviews = 0 WHERE id = $1', [sellerId]);
      }
    }

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'review_deleted', 'review', $2, $3)`,
      [
        req.user.id,
        reviewId,
        JSON.stringify({ product_id: productId })
      ]
    );

    res.json({ message: 'Отзыв удален' });
  } catch (error) {
    console.error('Ошибка удаления отзыва:', error);
    res.status(500).json({ error: 'Ошибка удаления отзыва' });
  }
});

// Редактировать магазин (админом)
router.put('/sellers/:sellerId/edit', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { shop_name, description, banner_url, logo_url, social_links } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (shop_name !== undefined) {
      updates.push(`shop_name = $${paramIndex}`);
      params.push(shop_name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (banner_url !== undefined) {
      updates.push(`banner_url = $${paramIndex}`);
      params.push(banner_url);
      paramIndex++;
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex}`);
      params.push(logo_url);
      paramIndex++;
    }

    if (social_links !== undefined) {
      updates.push(`social_links = $${paramIndex}`);
      params.push(JSON.stringify(social_links));
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(sellerId);

    const result = await db.query(
      `UPDATE sellers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'seller_edited', 'seller', $2, $3)`,
      [
        req.user.id,
        sellerId,
        JSON.stringify({ updates })
      ]
    );

    res.json({ seller: result.rows[0] });
  } catch (error) {
    console.error('Ошибка редактирования магазина:', error);
    res.status(500).json({ error: 'Ошибка редактирования магазина' });
  }
});

// Начислить платную услугу магазину
router.post('/sellers/:sellerId/promotions', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { promotion_type, duration_months, price, product_id, collection_id } = req.body;

    if (!promotion_type || !duration_months) {
      return res.status(400).json({ error: 'promotion_type и duration_months обязательны' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration_months);

    let targetId = null;
    if (promotion_type === 'product') {
      targetId = product_id;
      // Устанавливаем флаг продвижения
      if (targetId) {
        await db.query(
          `UPDATE products SET is_promoted = true, promotion_until = $1 WHERE id = $2`,
          [endDate, targetId]
        );
      }
    } else if (promotion_type === 'collection') {
      targetId = collection_id;
    }

    const result = await db.query(
      `INSERT INTO promotions (seller_id, product_id, promotion_type, duration_months, price, payment_status, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, 'paid', 'active', $6, $7)
       RETURNING *`,
      [
        sellerId,
        targetId,
        promotion_type,
        duration_months,
        price || 0,
        startDate,
        endDate
      ]
    );

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'promotion_added', 'promotion', $2, $3)`,
      [
        req.user.id,
        result.rows[0].id,
        JSON.stringify({ seller_id: sellerId, promotion_type, duration_months })
      ]
    );

    res.json({ promotion: result.rows[0] });
  } catch (error) {
    console.error('Ошибка начисления услуги:', error);
    res.status(500).json({ error: 'Ошибка начисления услуги' });
  }
});

// Получить все переписки (для админа)
router.get('/messages', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, seller_id } = req.query;

    let query = `
      SELECT DISTINCT ON (CASE WHEN m.sender_id = u1.id THEN m.receiver_id ELSE m.sender_id END)
        CASE WHEN m.sender_id = u1.id THEN m.receiver_id ELSE m.sender_id END as chat_user_id,
        u1.username as user1_username,
        u1.first_name as user1_first_name,
        u2.username as user2_username,
        u2.first_name as user2_first_name,
        m.text as last_message,
        m.created_at as last_message_time
      FROM messages m
      INNER JOIN users u1 ON m.sender_id = u1.id
      INNER JOIN users u2 ON m.receiver_id = u2.id
    `;

    const params = [];
    let paramIndex = 1;

    if (user_id) {
      query += ` WHERE (m.sender_id = $${paramIndex} OR m.receiver_id = $${paramIndex})`;
      params.push(user_id);
      paramIndex++;
    }

    if (seller_id) {
      const sellerUserResult = await db.query('SELECT user_id FROM sellers WHERE id = $1', [seller_id]);
      if (sellerUserResult.rows.length > 0) {
        const sellerUserId = sellerUserResult.rows[0].user_id;
        if (paramIndex === 1) {
          query += ` WHERE `;
        } else {
          query += ` AND `;
        }
        query += `(m.sender_id = $${paramIndex} OR m.receiver_id = $${paramIndex})`;
        params.push(sellerUserId);
        paramIndex++;
      }
    }

    query += ` ORDER BY chat_user_id, m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ chats: result.rows });
  } catch (error) {
    console.error('Ошибка получения переписок:', error);
    res.status(500).json({ error: 'Ошибка получения переписок' });
  }
});

// Получить переписку между двумя пользователями (для админа)
router.get('/messages/chat/:userId1/:userId2', requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT m.*, 
        sender.username as sender_username,
        sender.first_name as sender_first_name,
        receiver.username as receiver_username,
        receiver.first_name as receiver_first_name
       FROM messages m
       INNER JOIN users sender ON m.sender_id = sender.id
       INNER JOIN users receiver ON m.receiver_id = receiver.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, parseInt(limit), parseInt(offset)]
    );

    res.json({
      messages: result.rows.reverse(),
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения переписки:', error);
    res.status(500).json({ error: 'Ошибка получения переписки' });
  }
});

// Управление администраторами (только для суперадмина)
router.post('/admins', requireRole('superadmin'), async (req, res) => {
  try {
    const { user_id, action } = req.body; // action: 'promote' или 'demote'

    if (!user_id || !action) {
      return res.status(400).json({ error: 'user_id и action обязательны' });
    }

    const newRole = action === 'promote' ? 'admin' : 'user';

    await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, user_id]);

    // Аудит лог
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, 'user', $3, $4)`,
      [
        req.user.id,
        action === 'promote' ? 'admin_promoted' : 'admin_demoted',
        user_id,
        JSON.stringify({ new_role: newRole })
      ]
    );

    res.json({ message: action === 'promote' ? 'Пользователь назначен администратором' : 'Права администратора сняты' });
  } catch (error) {
    console.error('Ошибка управления администраторами:', error);
    res.status(500).json({ error: 'Ошибка управления администраторами' });
  }
});

// Получить всех администраторов (для суперадмина)
router.get('/admins', requireRole('superadmin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.*, COUNT(al.id) as actions_count
       FROM users u
       LEFT JOIN audit_logs al ON al.admin_id = u.id
       WHERE u.role IN ('admin', 'superadmin')
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Ошибка получения администраторов:', error);
    res.status(500).json({ error: 'Ошибка получения администраторов' });
  }
});

export default router;

