import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { authenticateTelegram, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }

    const initData = WebApp.initDataUnsafe;
    if (initData?.user) {
      authenticateTelegram(initData.user);
    } else {
      // Если нет данных Telegram, показываем сообщение
      WebApp.showAlert('Откройте приложение через Telegram');
    }
  }, [user, navigate, authenticateTelegram]);

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <p>Авторизация...</p>
    </div>
  );
};

export default Login;

