import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Генерировать реферальную ссылку
router.post('/generate', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, target_id } = req.body; // type: 'shop', 'product', 'user'

    // Генерируем уникальный код
    const referralCode = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Создаем реферальную ссылку
    const result = await db.query(
      `INSERT INTO referrals (referrer_id, referral_code)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, referralCode]
    );

    // Формируем ссылку
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    let referralUrl = `${baseUrl}?ref=${referralCode}`;

    if (type === 'shop' && target_id) {
      referralUrl += `&type=shop&id=${target_id}`;
    } else if (type === 'product' && target_id) {
      referralUrl += `&type=product&id=${target_id}`;
    }

    res.json({
      referral: result.rows[0],
      code: referralCode,
      url: referralUrl
    });
  } catch (error) {
    console.error('Ошибка создания реферальной ссылки:', error);
    res.status(500).json({ error: 'Ошибка создания реферальной ссылки' });
  }
});

// Получить статистику по рефералам
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE referred_id IS NOT NULL) as successful_referrals,
        SUM(reward_amount) FILTER (WHERE reward_amount IS NOT NULL) as total_rewards
       FROM referrals
       WHERE referrer_id = $1`,
      [userId]
    );

    const recentReferrals = await db.query(
      `SELECT r.*, u.username, u.first_name, u.last_name
       FROM referrals r
       LEFT JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      stats: statsResult.rows[0],
      recent_referrals: recentReferrals.rows
    });
  } catch (error) {
    console.error('Ошибка получения статистики рефералов:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Обработать реферальный код (при регистрации нового пользователя)
router.post('/use', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Реферальный код обязателен' });
    }

    // Находим реферальную ссылку
    const referralResult = await db.query(
      'SELECT * FROM referrals WHERE referral_code = $1',
      [code]
    );

    if (referralResult.rows.length === 0) {
      return res.status(404).json({ error: 'Реферальный код не найден' });
    }

    const referral = referralResult.rows[0];

    // Проверяем, что пользователь не использует свой собственный код
    if (referral.referrer_id === userId) {
      return res.status(400).json({ error: 'Нельзя использовать собственный реферальный код' });
    }

    // Проверяем, не использовал ли уже этот код
    if (referral.referred_id) {
      return res.status(400).json({ error: 'Этот реферальный код уже использован' });
    }

    // Обновляем реферальную ссылку
    await db.query(
      `UPDATE referrals SET referred_id = $1 WHERE id = $2`,
      [userId, referral.id]
    );

    // Здесь можно добавить логику начисления наград
    // Например, начислить бонусы рефереру и новому пользователю

    res.json({
      message: 'Реферальный код применен',
      referrer_id: referral.referrer_id
    });
  } catch (error) {
    console.error('Ошибка использования реферального кода:', error);
    res.status(500).json({ error: 'Ошибка использования реферального кода' });
  }
});

export default router;

