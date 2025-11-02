import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Отправить сообщение
router.post('/', authenticate, async (req, res) => {
  try {
    const { receiver_id, order_id, text } = req.body;
    const senderId = req.user.id;

    if (!receiver_id || !text) {
      return res.status(400).json({ error: 'Получатель и текст сообщения обязательны' });
    }

    // Проверяем, что получатель существует
    const receiverResult = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [receiver_id]
    );

    if (receiverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Получатель не найден' });
    }

    // Проверяем, что отправитель и получатель не одно лицо
    if (senderId === receiver_id) {
      return res.status(400).json({ error: 'Нельзя отправить сообщение самому себе' });
    }

    // Если привязано к заказу, проверяем что заказ существует и связан с одним из участников
    if (order_id) {
      const orderResult = await db.query(
        'SELECT user_id, seller_id FROM orders WHERE id = $1',
        [order_id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Заказ не найден' });
      }

      const order = orderResult.rows[0];
      const sellerUserResult = await db.query(
        'SELECT user_id FROM sellers WHERE id = $1',
        [order.seller_id]
      );

      if (sellerUserResult.rows.length > 0) {
        const sellerUserId = sellerUserResult.rows[0].user_id;
        if (senderId !== order.user_id && senderId !== sellerUserId) {
          return res.status(403).json({ error: 'Нет доступа к этому заказу' });
        }
        if (receiver_id !== order.user_id && receiver_id !== sellerUserId) {
          return res.status(403).json({ error: 'Получатель не связан с этим заказом' });
        }
      }
    }

    // Создаем сообщение
    const result = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, order_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, receiver_id, order_id || null, text]
    );

    // Проверяем роль получателя для определения типа уведомления
    const receiverRoleResult = await db.query('SELECT role FROM users WHERE id = $1', [receiver_id]);
    const receiverRole = receiverRoleResult.rows[0]?.role;
    const senderRoleResult = await db.query('SELECT role FROM users WHERE id = $1', [senderId]);
    const senderRole = senderRoleResult.rows[0]?.role;

    // Определяем тип уведомления
    let notificationType = 'message';
    if (receiverRole === 'admin' || receiverRole === 'superadmin') {
      // Если получатель - админ, и отправитель - обычный пользователь, это запрос в поддержку
      if (senderRole === 'user') {
        notificationType = 'support_message';
      } else if (senderRole === 'seller' || senderRole === 'admin') {
        notificationType = 'partner_message';
      }
    }

    // Создаем уведомление получателю
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        receiver_id,
        notificationType,
        notificationType === 'support_message' ? 'Новый запрос в поддержку' : 'Новое сообщение',
        `Новое сообщение от ${req.user.first_name || req.user.username || 'пользователя'}`,
        JSON.stringify({ sender_id: senderId, message_id: result.rows[0].id, order_id })
      ]
    );

    // Отправляем email-дубликат, если это запрос в поддержку
    if (notificationType === 'support_message') {
      try {
        const emailData = {
          to: 'kirucha2003@gmail.com',
          subject: `Запрос в поддержку от ${req.user.first_name || req.user.username || 'пользователя'}`,
          text: `
Новый запрос в поддержку!

От: ${req.user.first_name || ''} ${req.user.last_name || ''} (@${req.user.username || 'неизвестно'})
Telegram ID: ${req.user.telegram_id}
User ID: ${senderId}

Сообщение:
${text}

---
Ответить можно через админ-панель: https://telegram-marketplace-production-c6e5.up.railway.app/admin/support-chat/${senderId}
          `.trim()
        };

        // Используем fetch для отправки через Resend API или другой email сервис
        // Для простоты используем встроенный console.log, но в production нужен реальный email сервис
        console.log('📧 Email notification:', emailData);
        
        // Если есть RESEND_API_KEY, отправляем через Resend
        if (process.env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'support@telegram-marketplace.com',
              to: emailData.to,
              subject: emailData.subject,
              text: emailData.text
            })
          });
        }
      } catch (emailError) {
        console.error('Ошибка отправки email:', emailError);
        // Не блокируем основной процесс, если email не отправился
      }
    }

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// Получить переписку с пользователем
router.get('/chat/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const { limit = 100, offset = 0 } = req.query;

    // Получаем сообщения между текущим пользователем и другим
    const result = await db.query(
      `SELECT m.*, 
        sender.username as sender_username,
        sender.first_name as sender_first_name,
        sender.photo_url as sender_photo,
        receiver.username as receiver_username,
        receiver.first_name as receiver_first_name
       FROM messages m
       INNER JOIN users sender ON m.sender_id = sender.id
       INNER JOIN users receiver ON m.receiver_id = receiver.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [currentUserId, userId, parseInt(limit), parseInt(offset)]
    );

    // Отмечаем сообщения как прочитанные
    await db.query(
      `UPDATE messages SET is_read = true
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
      [currentUserId, userId]
    );

    res.json({
      messages: result.rows.reverse(), // Переворачиваем для хронологического порядка
      total: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения переписки:', error);
    res.status(500).json({ error: 'Ошибка получения переписки' });
  }
});

// Получить список чатов (диалогов)
router.get('/chats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Получаем последнее сообщение из каждого чата
    const result = await db.query(
      `SELECT DISTINCT ON (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as chat_user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.photo_url,
        m.text as last_message,
        m.created_at as last_message_time,
        m.is_read,
        COUNT(*) FILTER (WHERE m.receiver_id = $1 AND m.is_read = false) as unread_count
       FROM messages m
       INNER JOIN users u ON (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END = u.id)
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       GROUP BY chat_user_id, u.id, m.id, m.text, m.created_at, m.is_read
       ORDER BY chat_user_id, m.created_at DESC`,
      [userId]
    );

    res.json({ chats: result.rows });
  } catch (error) {
    console.error('Ошибка получения списка чатов:', error);
    res.status(500).json({ error: 'Ошибка получения списка чатов' });
  }
});

// Отметить сообщения как прочитанные
router.put('/read/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await db.query(
      `UPDATE messages SET is_read = true
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [userId, currentUserId]
    );

    res.json({ message: 'Сообщения отмечены как прочитанные' });
  } catch (error) {
    console.error('Ошибка отметки сообщений:', error);
    res.status(500).json({ error: 'Ошибка отметки сообщений' });
  }
});

// Получить список запросов поддержки (для админа)
router.get('/support-requests', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Проверяем, что пользователь - админ или суперадмин
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [currentUserId]);
    if (!userResult.rows[0] || (userResult.rows[0].role !== 'admin' && userResult.rows[0].role !== 'superadmin')) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Получаем все чаты, где пользователи писали админу (support requests)
    const result = await db.query(
      `WITH last_messages AS (
        SELECT DISTINCT ON (m.sender_id)
          m.sender_id,
          m.text as last_message,
          m.created_at as last_message_time,
          m.is_read
        FROM messages m
        WHERE m.receiver_id = $1
        ORDER BY m.sender_id, m.created_at DESC
      )
      SELECT 
        lm.sender_id as user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.photo_url,
        u.role as user_role,
        lm.last_message,
        lm.last_message_time,
        lm.is_read,
        COUNT(*) FILTER (WHERE m.receiver_id = $1 AND m.is_read = false) as unread_count
       FROM last_messages lm
       INNER JOIN users u ON lm.sender_id = u.id
       LEFT JOIN messages m ON m.sender_id = lm.sender_id AND m.receiver_id = $1
       WHERE u.role = 'user'
       GROUP BY lm.sender_id, u.id, lm.last_message, lm.last_message_time, lm.is_read
       ORDER BY lm.last_message_time DESC`,
      [currentUserId]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Ошибка получения запросов поддержки:', error);
    res.status(500).json({ error: 'Ошибка получения запросов поддержки' });
  }
});

export default router;

