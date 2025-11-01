import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TelegramBackButton.css';

const TelegramBackButton = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    // Показываем кнопку "Назад"
    webApp.BackButton.show();

    // Обработчик клика
    const handleBack = () => {
      navigate(-1);
    };

    webApp.BackButton.onClick(handleBack);

    return () => {
      webApp.BackButton.offClick(handleBack);
      webApp.BackButton.hide();
    };
  }, [navigate]);

  return null; // Компонент не рендерит UI
};

export default TelegramBackButton;

