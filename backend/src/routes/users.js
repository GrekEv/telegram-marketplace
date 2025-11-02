import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Получить ID администратора для поддержки
router.get('/support-admin', authenticate, async (req, res) => {
  try {
    // Получаем первого доступного админа или суперадмина
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

// Получить ленту товаров