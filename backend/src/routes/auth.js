import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';
import { validateTelegramWebAppData, parseTelegramInitData, isInitDataFresh } from '../utils/telegramAuth.js';

const router = express.Router();

// Регистрация/авторизация через Telegram
router.post('/telegram', async (req, res) => {
  try {
    let { initData, id, first_name, last_name, username, photo_url } = req.body;

    // Если передан initData, валидируем его
    if (initData) {
      const isValid = validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN);
      if (!isValid) {
        return res.status(401).json({ error: 'Невалидные данные Telegram' });
      }

      // Проверяем актуальность данных
      if (!isInitDataFresh(initData)) {
        return res.status(401).json({ error: 'Данные устарели. Перезагрузите приложение' });
      }

      // Парсим данные из initData
      const telegramUser = parseTelegramInitData(initData);
      if (!telegramUser) {
        return res.status(400).json({ error: 'Не удалось извлечь данные пользователя' });
      }

      // Используем данные из initData
      id = telegramUser.id;
      first_name = telegramUser.first_name;
      last_name = telegramUser.last_name;
      username = telegramUser.username;
      photo_url = telegramUser.photo_url;
    }

    if (!id) {
      return res.status(400).json({ error: 'Telegram ID обязателен' });
    }

    // Проверяем, есть ли пользователь
    let userResult = await db.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [id]
    );

    let user;

    if (userResult.rows.length === 0) {
      // Создаем нового пользователя
      const result = await db.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, role)
         VALUES ($1, $2, $3, $4, $5, 'user')
         RETURNING *`,
        [id, username || null, first_name || null, last_name || null, photo_url || null]
      );
      user = result.rows[0];
    } else {
      // Обновляем данные пользователя
      const result = await db.query(
        `UPDATE users 
         SET username = $1, first_name = $2, last_name = $3, photo_url = $4, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $5
         RETURNING *`,
        [username || null, first_name || null, last_name || null, photo_url || null, id]
      );
      user = result.rows[0];
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegram_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        photo_url: user.photo_url,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// Получить текущего пользователя
router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, telegram_id, username, first_name, last_name, photo_url, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем, есть ли у пользователя магазин
    let seller = null;
    if (req.user.role === 'seller' || req.user.role === 'admin' || req.user.role === 'superadmin') {
      const sellerResult = await db.query(
        'SELECT * FROM sellers WHERE user_id = $1',
        [req.user.id]
      );
      seller = sellerResult.rows.length > 0 ? sellerResult.rows[0] : null;
    }

    res.json({
      user: userResult.rows[0],
      seller
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка получения данных пользователя' });
  }
});

export default router;

