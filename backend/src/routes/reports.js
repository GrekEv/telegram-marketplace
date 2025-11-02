import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Создать жалобу
router.post('/', authenticate, async (req, res) => {
  try {
    const { reported_user_id, reported_product_id, reported_comment_id, reason, description } = req.body;
    const reporterId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Причина жалобы обязательна' });
    }

    if (!reported_user_id && !reported_product_id && !reported_comment_id) {
      return res.status(400).json({ error: 'Укажите объект жалобы' });
    }

    // Проверяем, не отправлял ли уже жалобу на этот объект
    const existingReport = await db.query(
      `SELECT id FROM reports 
       WHERE reporter_id = $1 
         AND (
           (reported_user_id = $2 AND $2 IS NOT NULL) OR
           (reported_product_id = $3 AND $3 IS NOT NULL) OR
           (reported_comment_id = $4 AND $4 IS NOT NULL)
         )
       LIMIT 1`,
      [reporterId, reported_user_id, reported_product_id, reported_comment_id]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже подавали жалобу на этот объект' });
    }

    const result = await db.query(
      `INSERT INTO reports (reporter_id, reported_user_id, reported_product_id, reported_comment_id, reason, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        reporterId,
        reported_user_id || null,
        reported_product_id || null,
        reported_comment_id || null,
        reason,
        description || null
      ]
    );

    // Уведомляем всех админов о новой жалобе
    const adminsResult = await db.query(
      "SELECT id FROM users WHERE role IN ('admin', 'superadmin')"
    );

    const reporterUser = await db.query('SELECT username, first_name FROM users WHERE id = $1', [reporterId]);
    const reporterName = reporterUser.rows[0]?.username || reporterUser.rows[0]?.first_name || 'Пользователь';

    for (const admin of adminsResult.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1, 'report', 'Новая жалоба', 
         'Новая жалоба от ' || $2 || ': ' || $3, $4)`,
        [
          admin.id,
          reporterName,
          reason,
          JSON.stringify({ report_id: result.rows[0].id, reason, description: description || null })
        ]
      );
    }

    res.json({
      report: result.rows[0],
      message: 'Жалоба отправлена на рассмотрение'
    });
  } catch (error) {
    console.error('Ошибка создания жалобы:', error);
    res.status(500).json({ error: 'Ошибка создания жалобы' });
  }
});

// Получить мои жалобы
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT r.*,
        u1.username as reported_username
       FROM reports r
       LEFT JOIN users u1 ON r.reported_user_id = u1.id
       WHERE r.reporter_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json({ reports: result.rows });
  } catch (error) {
    console.error('Ошибка получения жалоб:', error);
    res.status(500).json({ error: 'Ошибка получения жалоб' });
  }
});

export default router;

