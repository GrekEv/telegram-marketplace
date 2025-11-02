import db from '../database/connection.js';

/**
 * Автоматически обновляет уровень продавца на основе статистики
 * Bronze: 0-10 продаж или рейтинг < 4.0
 * Silver: 11-50 продаж и рейтинг >= 4.0
 * Gold: 51+ продаж и рейтинг >= 4.5 и отзывов >= 20
 */
export async function updateSellerLevel(sellerId) {
  try {
    const statsResult = await db.query(
      `SELECT 
        s.total_sales,
        s.total_reviews,
        s.rating,
        COUNT(DISTINCT o.id) as completed_orders
       FROM sellers s
       LEFT JOIN orders o ON o.seller_id = s.id AND o.order_status = 'delivered'
       WHERE s.id = $1
       GROUP BY s.id`,
      [sellerId]
    );

    if (statsResult.rows.length === 0) {
      return null;
    }

    const stats = statsResult.rows[0];
    const totalSales = parseInt(stats.total_sales || 0);
    const totalReviews = parseInt(stats.total_reviews || 0);
    const rating = parseFloat(stats.rating || 0);
    const completedOrders = parseInt(stats.completed_orders || 0);

    let newLevel = 'bronze';

    // Gold: 51+ продаж, рейтинг >= 4.5, отзывов >= 20
    if (completedOrders >= 51 && rating >= 4.5 && totalReviews >= 20) {
      newLevel = 'gold';
    }
    // Silver: 11-50 продаж и рейтинг >= 4.0
    else if (completedOrders >= 11 && rating >= 4.0) {
      newLevel = 'silver';
    }

    // Обновляем уровень, только если он изменился
    const currentLevelResult = await db.query(
      'SELECT seller_level FROM sellers WHERE id = $1',
      [sellerId]
    );

    if (currentLevelResult.rows.length > 0) {
      const currentLevel = currentLevelResult.rows[0].seller_level;
      
      if (currentLevel !== newLevel) {
        await db.query(
          'UPDATE sellers SET seller_level = $1 WHERE id = $2',
          [newLevel, sellerId]
        );
        
        // Отправляем уведомление о повышении уровня
        const sellerUserResult = await db.query(
          'SELECT user_id FROM sellers WHERE id = $1',
          [sellerId]
        );
        
        if (sellerUserResult.rows.length > 0) {
          const levelNames = {
            bronze: 'Бронза',
            silver: 'Серебро',
            gold: 'Золото'
          };
          
          await db.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'seller_level_up', 'Повышение уровня!', 
             'Поздравляем! Вы достигли уровня "${levelNames[newLevel]}"!', 
             $2)`,
            [
              sellerUserResult.rows[0].user_id,
              JSON.stringify({ seller_id: sellerId, new_level: newLevel })
            ]
          );
        }
        
        return { old_level: currentLevel, new_level: newLevel };
      }
    }

    return { old_level: null, new_level: newLevel };
  } catch (error) {
    console.error('Ошибка обновления уровня продавца:', error);
    return null;
  }
}

