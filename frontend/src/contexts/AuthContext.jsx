import { createContext, useContext, useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import api from '../utils/api';
import { initTelegramWebApp, getTelegramInitData, getTelegramUser, isInTelegram } from '../utils/telegram';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Инициализируем Telegram WebApp
    if (isInTelegram()) {
      initTelegramWebApp();
    }

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      // Авторизация через Telegram
      const telegramUser = getTelegramUser();
      if (telegramUser) {
        authenticateTelegram(telegramUser);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const authenticateTelegram = async (telegramUser) => {
    try {
      // Получаем initData для валидации на сервере
      const initData = getTelegramInitData();
      
      const response = await api.post('/auth/telegram', {
        initData: initData, // Отправляем initData для валидации
        id: telegramUser.id,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        username: telegramUser.username,
        photo_url: telegramUser.photo_url
      });

      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setLoading(false);
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      localStorage.removeItem('token');
      setToken(null);
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, loading, authenticateTelegram, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

