import { validateTelegramWebAppData, isInitDataFresh } from '../utils/telegramAuth.js';

/**
 * Middleware для проверки Telegram WebApp данных
 */
export const validateTelegramData = (req, res, next) => {
  const initData = req.body.initData || req.headers['x-telegram-init-data'];
  
  if (!initData) {
    // Если initData нет, это может быть обычный запрос (для тестирования)
    // Разрешаем продолжить, но без гарантий безопасности
    return next();
  }

  const isValid = validateTelegramWebAppData(initData, process.env.TELEGRAM_BOT_TOKEN);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Невалидные данные Telegram' });
  }

  if (!isInitDataFresh(initData)) {
    return res.status(401).json({ error: 'Данные устарели. Перезагрузите приложение' });
  }

  next();
};

