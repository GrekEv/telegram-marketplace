import jwt from 'jsonwebtoken';
import db from '../database/connection.js';

// Проверка JWT токена
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Получаем пользователя из БД
    const result = await db.query(
      'SELECT id, telegram_id, username, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'Пользователь не найден или заблокирован' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
    return res.status(500).json({ error: 'Ошибка аутентификации' });
  }
};

// Проверка роли
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    next();
  };
};

// Проверка, что пользователь является продавцом
export const requireSeller = async (req, res, next) => {
  try {
    // Админы и суперадмины всегда имеют доступ
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next();
    }

    if (req.user.role === 'seller') {
      // Для продавцов проверяем наличие магазина
      const sellerResult = await db.query(
        'SELECT id, status FROM sellers WHERE user_id = $1 AND status = $2',
        [req.user.id, 'approved']
      );

      if (sellerResult.rows.length === 0) {
        return res.status(403).json({ error: 'Требуется статус продавца' });
      }

      req.seller = sellerResult.rows[0];
      return next();
    }

    // Для обычных пользователей проверяем наличие магазина (pending или approved)
    const sellerResult = await db.query(
      'SELECT id, status FROM sellers WHERE user_id = $1 AND status IN ($2, $3)',
      [req.user.id, 'pending', 'approved']
    );

    if (sellerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Требуется статус продавца. Подайте заявку на создание магазина.' });
    }

    req.seller = sellerResult.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка проверки статуса продавца' });
  }
};

