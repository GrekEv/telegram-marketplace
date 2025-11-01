import WebApp from '@twa-dev/sdk';

/**
 * Инициализация Telegram WebApp
 */
export function initTelegramWebApp() {
  if (window.Telegram?.WebApp) {
    const webApp = window.Telegram.WebApp;
    
    // Расширяем на весь экран
    webApp.expand();
    
    // Включаем закрытие по свайпу вниз
    webApp.enableClosingConfirmation();
    
    // Настройка темы
    if (webApp.themeParams) {
      applyTheme(webApp.themeParams);
    }
    
    // Обработчик изменения темы
    webApp.onEvent('themeChanged', applyTheme);
    
    // Показываем главную кнопку (Main Button) при необходимости
    webApp.MainButton.setText('Загрузить');
    webApp.MainButton.hide();
    
    // Показываем кнопку "Назад" при необходимости
    webApp.BackButton.hide();
    
    return webApp;
  }
  
  return null;
}

/**
 * Применение темы Telegram
 */
function applyTheme(themeParams) {
  const root = document.documentElement;
  
  if (themeParams.bg_color) {
    root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
  }
  if (themeParams.text_color) {
    root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
  }
  if (themeParams.hint_color) {
    root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
  }
  if (themeParams.link_color) {
    root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
  }
  if (themeParams.button_color) {
    root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
  }
  if (themeParams.button_text_color) {
    root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
  }
  if (themeParams.secondary_bg_color) {
    root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
  }
}

/**
 * Получение initData для отправки на сервер
 */
export function getTelegramInitData() {
  if (window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return null;
}

/**
 * Получение данных пользователя из Telegram
 */
export function getTelegramUser() {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
}

/**
 * Показ главной кнопки Telegram
 */
export function showMainButton(text, onClick) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.MainButton.setText(text);
    webApp.MainButton.onClick(onClick);
    webApp.MainButton.show();
  }
}

/**
 * Скрытие главной кнопки Telegram
 */
export function hideMainButton() {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.MainButton.hide();
  }
}

/**
 * Вибрация (haptic feedback)
 */
export function hapticFeedback(type = 'impact') {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.HapticFeedback) {
    switch (type) {
      case 'light':
        webApp.HapticFeedback.impactOccurred('light');
        break;
      case 'medium':
        webApp.HapticFeedback.impactOccurred('medium');
        break;
      case 'heavy':
        webApp.HapticFeedback.impactOccurred('heavy');
        break;
      case 'success':
        webApp.HapticFeedback.notificationOccurred('success');
        break;
      case 'error':
        webApp.HapticFeedback.notificationOccurred('error');
        break;
      default:
        webApp.HapticFeedback.impactOccurred('medium');
    }
  }
}

/**
 * Показ алерта через Telegram
 */
export function showAlert(message) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Показ подтверждения через Telegram
 */
export function showConfirm(message) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    return webApp.showConfirm(message);
  }
  return Promise.resolve(confirm(message));
}

/**
 * Закрытие приложения
 */
export function closeApp() {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.close();
  }
}

/**
 * Открытие ссылки во внешнем браузере
 */
export function openLink(url, options = {}) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.openLink(url, options);
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Открытие Telegram-ссылки
 */
export function openTelegramLink(link) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.openTelegramLink(link);
  } else {
    window.open(link, '_blank');
  }
}

/**
 * Отправка данных в бота
 */
export function sendDataToBot(data) {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.sendData(JSON.stringify(data));
  }
}

/**
 * Проверка, запущено ли приложение в Telegram
 */
export function isInTelegram() {
  return !!window.Telegram?.WebApp;
}

/**
 * Получение версии платформы
 */
export function getPlatform() {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    return webApp.platform;
  }
  return 'unknown';
}

/**
 * Получение версии приложения
 */
export function getVersion() {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    return webApp.version;
  }
  return 'unknown';
}

