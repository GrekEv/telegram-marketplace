import express from 'express';
import db from '../database/connection.js';
import { authenticate, requireSeller } from '../middleware/auth.js';
import OpenAI from 'openai';

const router = express.Router();

// Инициализация DeepSeek API клиента
const deepseek = new OpenAI({
  apiKey: 'sk-85910d604cfe4ed9a3ff57d8359a590a',
  baseURL: 'https://api.deepseek.com'
});

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

// Чат с ИИ через DeepSeek
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, conversation_history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    // Системный промпт для AI-ассистента маркетплейса
    const systemPrompt = `Ты - умный AI-ассистент для продавцов на маркетплейсе Telegram. 
Твоя задача - помогать продавцам улучшать свои товары и увеличивать продажи.

Ты можешь помочь с:
• Созданием привлекательных описаний товаров
• Установкой правильных цен
• Стратегиями увеличения продаж
• Советами по фотографированию товаров
• Оптимизацией магазина
• Работой с отзывами и клиентами
• Продвижением товаров

Отвечай на русском языке, будь дружелюбным и конкретным. 
Давай практические советы и примеры.`;

    // Формируем историю сообщений для контекста
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Добавляем историю разговора, если есть
    if (conversation_history && Array.isArray(conversation_history)) {
      conversation_history.forEach(msg => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });
    }

    // Добавляем текущее сообщение
    messages.push({ role: 'user', content: message });

    // Отправляем запрос к DeepSeek API
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Извините, не удалось получить ответ';

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Ошибка DeepSeek API:', error);
    
    // Если API недоступен, используем fallback
    let fallbackResponse = 'Извините, AI-ассистент временно недоступен. ';
    
    const lowerMessage = req.body.message.toLowerCase();
    if (lowerMessage.includes('описание') || lowerMessage.includes('товар')) {
      fallbackResponse += 'Для улучшения описания товара: добавьте ключевые слова, характеристики, преимущества и призыв к действию.';
    } else if (lowerMessage.includes('цена') || lowerMessage.includes('стоимость')) {
      fallbackResponse += 'При установке цены учитывайте себестоимость, цены конкурентов и уникальность товара.';
    } else if (lowerMessage.includes('продаж') || lowerMessage.includes('увеличить')) {
      fallbackResponse += 'Для увеличения продаж: используйте качественные фото, подробные описания, быстро отвечайте покупателям.';
    } else {
      fallbackResponse += 'Я могу помочь с описаниями товаров, установкой цен, увеличением продаж и оптимизацией магазина.';
    }
    
    res.json({ response: fallbackResponse });
  }
});

export default router;

