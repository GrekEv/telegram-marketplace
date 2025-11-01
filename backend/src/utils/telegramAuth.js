import crypto from 'crypto';

/**
 * Валидация initData от Telegram WebApp
 * @param {string} initData - строка initData из window.Telegram.WebApp.initData
 * @param {string} botToken - токен бота
 * @returns {boolean} - валидность данных
 */
export function validateTelegramWebAppData(initData, botToken) {
  try {
    if (!initData || !botToken) {
      return false;
    }

    // Парсим initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Сортируем параметры
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем хеш
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Сравниваем хеши
    return calculatedHash === hash;
  } catch (error) {
    console.error('Ошибка валидации Telegram данных:', error);
    return false;
  }
}

/**
 * Парсинг initData от Telegram
 * @param {string} initData - строка initData
 * @returns {Object} - распарсенные данные
 */
export function parseTelegramInitData(initData) {
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  
  if (!userStr) {
    return null;
  }

  try {
    const user = JSON.parse(decodeURIComponent(userStr));
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium || false,
      photo_url: user.photo_url || null
    };
  } catch (error) {
    console.error('Ошибка парсинга данных пользователя:', error);
    return null;
  }
}

/**
 * Извлечение auth_date для проверки актуальности
 */
export function getAuthDate(initData) {
  const params = new URLSearchParams(initData);
  const authDate = params.get('auth_date');
  return authDate ? parseInt(authDate) : null;
}

/**
 * Проверка актуальности данных (не старше 24 часов)
 */
export function isInitDataFresh(initData) {
  const authDate = getAuthDate(initData);
  if (!authDate) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const maxAge = 24 * 60 * 60; // 24 часа

  return (now - authDate) < maxAge;
}

