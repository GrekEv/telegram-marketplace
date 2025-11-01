import express from 'express';
import db from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Создать комментарий
router.post('/', authenticate, async (req, res) => {
  try {
    const { product_id, parent_comment_id, text } = req.body;
    const userId = req.user.id;

    if (!product_id || !text) {
      return res.status(400).json({ error: 'ID товара и текст комментария обязательны' });
    }

    // Проверяем существование товара
    const productResult = await db.query(
      'SELECT id, status FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    if (productResult.rows[0].status !== 'approved') {
      return res.status(403).json({ error: 'Нельзя комментировать неодобренные товары' });
    }

    // Если ответ на комментарий, проверяем существование родительского
    if (parent_comment_id) {
      const parentResult = await db.query(
        'SELECT id FROM comments WHERE id = $1 AND product_id = $2',
        [parent_comment_id, product_id]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Родительский комментарий не найден' });
      }
    }

    const result = await db.query(
      `INSERT INTO comments (user_id, product_id, parent_comment_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, product_id, parent_comment_id || null, text]
    );

    res.json({ comment: result.rows[0] });
  } catch (error) {
    console.error('Ошибка создания комментария:', error);
    res.status(500).json({ error: 'Ошибка создания комментария' });
  }
});

// Получить комментарии товара
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Получаем корневые комментарии (без родителя)
    const rootComments = await db.query(
      `SELECT c.*, u.username, u.first_name, u.last_name, u.photo_url
       FROM comments c
       INNER JOIN users u ON c.user_id = u.id
       WHERE c.product_id = $1 AND c.parent_comment_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), parseInt(offset)]
    );

    // Для каждого корневого комментария получаем ответы
    const commentsWithReplies = await Promise.all(
      rootComments.rows.map(async (comment) => {
        const replies = await db.query(
          `SELECT c.*, u.username, u.first_name, u.last_name, u.photo_url
           FROM comments c
           INNER JOIN users u ON c.user_id = u.id
           WHERE c.parent_comment_id = $1
           ORDER BY c.created_at ASC`,
          [comment.id]
        );
        return {
          ...comment,
          replies: replies.rows
        };
      })
    );

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM comments WHERE product_id = $1 AND parent_comment_id IS NULL',
      [productId]
    );

    res.json({
      comments: commentsWithReplies,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    res.status(500).json({ error: 'Ошибка получения комментариев' });
  }
});

// Обновить свой комментарий
router.put('/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text) {
      return res.status(400).json({ error: 'Текст комментария обязателен' });
    }

    const result = await db.query(
      `UPDATE comments SET text = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [text, commentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден или нет доступа' });
    }

    res.json({ comment: result.rows[0] });
  } catch (error) {
    console.error('Ошибка обновления комментария:', error);
    res.status(500).json({ error: 'Ошибка обновления комментария' });
  }
});

// Удалить свой комментарий
router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Проверяем, что комментарий принадлежит пользователю или пользователь - админ
    const commentResult = await db.query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    // Удаляем комментарий если это автор или админ
    const result = await db.query(
      `DELETE FROM comments 
       WHERE id = $1 AND (user_id = $2 OR $3 IN ('admin', 'superadmin'))
       RETURNING *`,
      [commentId, userId, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Нет доступа для удаления' });
    }

    res.json({ message: 'Комментарий удален' });
  } catch (error) {
    console.error('Ошибка удаления комментария:', error);
    res.status(500).json({ error: 'Ошибка удаления комментария' });
  }
});

export default router;

