import express from 'express';
import db from '../database/connection.js';
import { authenticate, requireSeller } from '../middleware/auth.js';

const router = express.Router();

// AI анализ товара и предложения по улучшению
router.post('/analyze-product', authenticate, requireSeller, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'ID товара обязателен' });
    }

    // Получаем информацию о товаре
    const productResult = await db.query(
      `SELECT p.*, s.shop_name
       FROM products p
       INNER JOIN sellers s ON p.seller_id = s.id
       WHERE p.id = $1`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const product = productResult.rows[0];

    // Получаем похожие товары для сравнения
    const similarProducts = await db.query(
      `SELECT name, price, description, purchases_count, rating
       FROM products
       WHERE status = 'approved' 
         AND seller_id != $1
         AND (tags && $2::jsonb OR name ILIKE $3)
       ORDER BY purchases_count DESC
       LIMIT 10`,
      [
        product.seller_id,
        JSON.stringify(product.tags || []),
        `%${product.name.split(' ')[0]}%`
      ]
    );

    // Простой AI анализ (в продакшене можно использовать реальный AI API)
    const analysis = {
      product_id: product_id,
      suggestions: [],
      price_analysis: null,
      description_analysis: null,
      tags_suggestions: []
    };

    // Анализ цены
    if (similarProducts.rows.length > 0) {
      const avgPrice = similarProducts.rows.reduce((sum, p) => sum + parseFloat(p.price || 0), 0) / similarProducts.rows.length;
      const productPrice = parseFloat(product.price);
      
      analysis.price_analysis = {
        current_price: productPrice,
        average_market_price: avgPrice,
        recommendation: productPrice > avgPrice * 1.2 
          ? 'Цена выше среднерыночной. Рассмотрите снижение для повышения конкурентоспособности.'
          : productPrice < avgPrice * 0.8
          ? 'Цена ниже среднерыночной. Возможно, стоит увеличить цену.'
          : 'Цена соответствует рыночной',
        optimal_price_range: {
          min: Math.round(avgPrice * 0.9),
          max: Math.round(avgPrice * 1.1)
        }
      };

      analysis.suggestions.push({
        type: 'price',
        priority: productPrice > avgPrice * 1.2 ? 'high' : 'low',
        message: analysis.price_analysis.recommendation
      });
    }

    // Анализ описания
    const descriptionLength = (product.description || '').length;
    if (descriptionLength < 50) {
      analysis.description_analysis = {
        current_length: descriptionLength,
        recommendation: 'Описание слишком короткое. Добавьте больше деталей о товаре.',
        optimal_length: '100-300 символов'
      };
      analysis.suggestions.push({
        type: 'description',
        priority: 'high',
        message: 'Расширьте описание товара для лучшего понимания покупателями'
      });
    } else if (descriptionLength > 500) {
      analysis.description_analysis = {
        current_length: descriptionLength,
        recommendation: 'Описание слишком длинное. Сделайте его более лаконичным.',
        optimal_length: '100-300 символов'
      };
      analysis.suggestions.push({
        type: 'description',
        priority: 'medium',
        message: 'Сократите описание для лучшей читаемости'
      });
    }

    // Анализ изображений
    const imagesCount = (product.images || []).length;
    if (imagesCount === 0) {
      analysis.suggestions.push({
        type: 'images',
        priority: 'high',
        message: 'Добавьте фотографии товара. Товары с фото продаются лучше.'
      });
    } else if (imagesCount < 3) {
      analysis.suggestions.push({
        type: 'images',
        priority: 'medium',
        message: `Рекомендуется добавить еще ${3 - imagesCount} фотографий товара с разных ракурсов`
      });
    }

    // Предложения по тегам (на основе популярных тегов похожих товаров)
    const popularTags = {};
    similarProducts.rows.forEach(p => {
      const tags = p.tags || [];
      tags.forEach(tag => {
        popularTags[tag] = (popularTags[tag] || 0) + 1;
      });
    });

    analysis.tags_suggestions = Object.entries(popularTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag)
      .filter(tag => !(product.tags || []).includes(tag));

    if (analysis.tags_suggestions.length > 0) {
      analysis.suggestions.push({
        type: 'tags',
        priority: 'low',
        message: `Рекомендуемые теги: ${analysis.tags_suggestions.join(', ')}`
      });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Ошибка AI анализа:', error);
    res.status(500).json({ error: 'Ошибка AI анализа' });
  }
});

// Автогенерация описания товара
router.post('/generate-description', authenticate, requireSeller, async (req, res) => {
  try {
    const { name, category, price, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название товара обязательно' });
    }

    // Простая генерация описания (в продакшене можно использовать GPT API)
    let description = `Прекрасный товар "${name}"`;

    if (category) {
      description += ` в категории ${category}`;
    }

    if (tags && tags.length > 0) {
      description += `. Теги: ${tags.join(', ')}.`;
    }

    description += ` Цена: ${price || 'уточняйте'} руб.`;

    // Добавляем шаблонные фразы
    description += ' Высокое качество. Быстрая доставка. Гарантия качества.';

    res.json({
      description: description,
      word_count: description.split(' ').length,
      character_count: description.length
    });
  } catch (error) {
    console.error('Ошибка генерации описания:', error);
    res.status(500).json({ error: 'Ошибка генерации описания' });
  }
});

// Анализ кликабельности описания
router.post('/analyze-clickability', authenticate, requireSeller, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Описание обязательно' });
    }

    // Анализ ключевых слов, которые увеличивают кликабельность
    const clickableWords = [
      'скидка', 'акция', 'новинка', 'популярный', 'топ', 'лучший',
      'качественный', 'премиум', 'эксклюзив', 'ограниченное предложение'
    ];

    const descriptionLower = description.toLowerCase();
    const foundWords = clickableWords.filter(word => descriptionLower.includes(word));

    // Оценка кликабельности
    let score = 50; // Базовый балл
    
    if (foundWords.length > 0) {
      score += foundWords.length * 10;
    }

    if (description.length > 100 && description.length < 300) {
      score += 10;
    }

    // Проверка на наличие вопросов (увеличивает вовлеченность)
    if (description.includes('?')) {
      score += 5;
    }

    // Проверка на эмодзи
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojiCount = (description.match(emojiRegex) || []).length;
    if (emojiCount > 0 && emojiCount <= 3) {
      score += 5;
    }

    res.json({
      score: Math.min(100, score),
      rating: score >= 80 ? 'отлично' : score >= 60 ? 'хорошо' : 'нужно улучшить',
      suggestions: foundWords.length === 0 
        ? ['Добавьте ключевые слова: "скидка", "акция", "новинка" для повышения кликабельности']
        : [],
      found_keywords: foundWords
    });
  } catch (error) {
    console.error('Ошибка анализа кликабельности:', error);
    res.status(500).json({ error: 'Ошибка анализа' });
  }
});

// Чат с ИИ
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    // Простой ответ на основе ключевых слов (можно заменить на реальный AI API)
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.includes('описание') || lowerMessage.includes('товар')) {
      response = 'Для улучшения описания товара рекомендую:\n\n1. Добавьте ключевые слова, которые ищут покупатели\n2. Укажите основные характеристики и преимущества\n3. Используйте эмоциональные слова: "уникальный", "качественный", "стильный"\n4. Добавьте призыв к действию: "Закажите сейчас", "Ограниченное предложение"\n5. Включите информацию о доставке и возврате';
    } else if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость')) {
      response = 'При установке цены учитывайте:\n\n1. Стоимость товара и доставки\n2. Цены конкурентов\n3. Уникальность товара\n4. Сезонность спроса\n5. Возможность скидок для привлечения покупателей\n\nРекомендую установить цену на 10-20% выше себестоимости, но ниже среднерыночной.';
    } else if (lowerMessage.includes('продаж') || lowerMessage.includes('увеличить')) {
      response = 'Чтобы увеличить продажи:\n\n1. Используйте качественные фотографии товара\n2. Добавляйте подробные описания\n3. Отвечайте быстро на вопросы покупателей\n4. Предлагайте скидки и акции\n5. Используйте продвижение товаров\n6. Собирайте и публикуйте отзывы\n7. Создавайте коллекции товаров';
    } else if (lowerMessage.includes('фото') || lowerMessage.includes('изображен')) {
      response = 'Для хороших фотографий товара:\n\n1. Используйте естественное освещение\n2. Показывайте товар с разных ракурсов\n3. Делайте фото на нейтральном фоне\n4. Показывайте товар в использовании\n5. Используйте высокое разрешение\n6. Добавьте фотографии деталей и упаковки';
    } else {
      response = 'Я могу помочь вам с:\n\n• Улучшением описаний товаров\n• Установкой цен\n• Увеличением продаж\n• Фотографированием товаров\n• Оптимизацией магазина\n\nЗадайте конкретный вопрос, и я дам рекомендации!';
    }

    res.json({ response });
  } catch (error) {
    console.error('Ошибка AI чата:', error);
    res.status(500).json({ error: 'Ошибка обработки запроса' });
  }
});

export default router;

