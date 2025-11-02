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
    
    // Определяем роль на основе username для администраторов
    let userRole = 'user';
    if (username === 'iskovs') {
      userRole = 'admin';
    } else if (username === 'kirilldeniushkin') {
      userRole = 'superadmin';
    }

    if (userResult.rows.length === 0) {
      // Создаем нового пользователя
      const result = await db.query(
        `INSERT INTO users (telegram_id, username, first_name, last_name, photo_url, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, username || null, first_name || null, last_name || null, photo_url || null, userRole]
      );
      user = result.rows[0];

      // Уведомляем админов о новой регистрации (только для обычных пользователей)
      if (userRole === 'user') {
        const adminsResult = await db.query(
          "SELECT id FROM users WHERE role IN ('admin', 'superadmin')"
        );

        const userName = username || first_name || `ID: ${id}`;
        
        for (const admin of adminsResult.rows) {
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'user_registration', 'Новый пользователь', 
             'Зарегистрирован новый пользователь: ' || $2, $3)`,
            [
              admin.id,
              userName,
              JSON.stringify({ user_id: user.id, telegram_id: id, username: username || null })
            ]
          );
        }
      }
    } else {
      // Обновляем данные пользователя, сохраняя роль админа если есть
      const existingRole = userResult.rows[0].role;
      const finalRole = (existingRole === 'admin' || existingRole === 'superadmin') ? existingRole : userRole;
      
      const result = await db.query(
        `UPDATE users 
         SET username = $1, first_name = $2, last_name = $3, photo_url = $4, role = $5, updated_at = CURRENT_TIMESTAMP
         WHERE telegram_id = $6
         RETURNING *`,
        [username || null, first_name || null, last_name || null, photo_url || null, finalRole, id]
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

// Получить пользователя по ID (для админов)
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем права доступа (только админ/суперадмин или сам пользователь)
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const userResult = await db.query(
      'SELECT id, telegram_id, username, first_name, last_name, photo_url, role, email, phone, address, city, postal_code FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
});

// Получить текущего пользователя
router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, telegram_id, username, first_name, last_name, photo_url, role, email, phone, address, city, postal_code FROM users WHERE id = $1',
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

// Обновить профиль пользователя
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, city, postal_code } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (first_name !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      params.push(first_name || null);
      paramIndex++;
    }

    if (last_name !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      params.push(last_name || null);
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      params.push(email || null);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      params.push(phone || null);
      paramIndex++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      params.push(address || null);
      paramIndex++;
    }

    if (city !== undefined) {
      updates.push(`city = $${paramIndex}`);
      params.push(city || null);
      paramIndex++;
    }

    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramIndex}`);
      params.push(postal_code || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    params.push(req.user.id);

    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} 
       RETURNING id, telegram_id, username, first_name, last_name, photo_url, role, email, phone, address, city, postal_code`,
      params
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

export default router;

