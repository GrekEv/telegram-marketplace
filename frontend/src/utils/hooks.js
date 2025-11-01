import { useEffect } from 'react';
import { hapticFeedback, showMainButton, hideMainButton } from './telegram';

/**
 * Хук для вибрации при клике
 */
export function useHapticFeedback() {
  return (type = 'medium') => {
    hapticFeedback(type);
  };
}

/**
 * Хук для главной кнопки Telegram
 */
export function useTelegramMainButton(text, onClick, enabled = true) {
  useEffect(() => {
    if (enabled && onClick) {
      showMainButton(text, onClick);
    } else {
      hideMainButton();
    }

    return () => {
      hideMainButton();
    };
  }, [text, onClick, enabled]);
}

/**
 * Хук для адаптации под тему Telegram
 */
export function useTelegramTheme() {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    const updateTheme = () => {
      const theme = webApp.themeParams;
      const root = document.documentElement;

      if (theme.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
      }
      if (theme.text_color) {
        root.style.setProperty('--tg-theme-text-color', theme.text_color);
      }
      if (theme.button_color) {
        root.style.setProperty('--tg-theme-button-color', theme.button_color);
      }
      if (theme.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
      }
      if (theme.secondary_bg_color) {
        root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);
      }
    };

    updateTheme();
    webApp.onEvent('themeChanged', updateTheme);

    return () => {
      webApp.offEvent('themeChanged', updateTheme);
    };
  }, []);
}

