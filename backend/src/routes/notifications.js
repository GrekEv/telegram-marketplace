import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить уведомления пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, unread_only = false } = req.query;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;

    const params = [userId];

    if (unread_only === 'true') {
      query += ' AND is_read = false';
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    const countResult = await db.query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM notifications WHERE user_id = $1`,
      [userId]
    );

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      unread: parseInt(countResult.rows[0].unread),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения уведомлений:', error);
    res.status(500).json({ error: 'Ошибка получения уведомлений' });
  }
});

// Отметить уведомление как прочитанное
router.put('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Ошибка отметки уведомления:', error);
    res.status(500).json({ error: 'Ошибка отметки уведомления' });
  }
});

// Отметить все уведомления как прочитанные
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка отметки всех уведомлений:', error);
    res.status(500).json({ error: 'Ошибка отметки уведомлений' });
  }
});

// Удалить уведомление
router.delete('/:notificationId', authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Уведомление не найдено' });
    }

    res.json({ message: 'Уведомление удалено' });
  } catch (error) {
    console.error('Ошибка удаления уведомления:', error);
    res.status(500).json({ error: 'Ошибка удаления уведомления' });
  }
});

export default router;

