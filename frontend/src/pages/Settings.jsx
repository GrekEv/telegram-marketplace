import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import Modal from '../components/Modal';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    darkMode: false,
    language: 'ru',
    currency: 'RUB'
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    // Загружаем настройки из localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedNotifications = localStorage.getItem('notifications') !== 'false';
    const savedEmailNotifications = localStorage.getItem('emailNotifications') === 'true';
    const savedLanguage = localStorage.getItem('language') || 'ru';
    const savedCurrency = localStorage.getItem('currency') || 'RUB';

    setSettings({
      notifications: savedNotifications,
      emailNotifications: savedEmailNotifications,
      darkMode: savedDarkMode,
      language: savedLanguage,
      currency: savedCurrency
    });

    // Применяем темную тему
    applyDarkTheme(savedDarkMode);
    
    // Загружаем email пользователя
    if (user?.email) {
      setEmailInput(user.email);
    }
  }, [user]);

  const applyDarkTheme = (enabled) => {
    if (enabled) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const handleToggle = async (key) => {
    if (key === 'emailNotifications' && !settings.emailNotifications) {
      // Если включаем email уведомления, проверяем наличие email
      if (!user?.email) {
        setShowEmailModal(true);
        return;
      }
    }

    const newValue = !settings[key];
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    // Сохраняем в localStorage
    if (key === 'darkMode') {
      localStorage.setItem('darkMode', newValue);
      applyDarkTheme(newValue);
    } else if (key === 'notifications') {
      localStorage.setItem('notifications', newValue);
    } else if (key === 'emailNotifications') {
      localStorage.setItem('emailNotifications', newValue);
    }
  };

  const handleSelect = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    localStorage.setItem(key, value);
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim()) {
      alert('Введите email адрес');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      alert('Введите корректный email адрес');
      return;
    }

    try {
      const response = await api.put('/auth/profile', {
        email: emailInput.trim()
      });

      if (updateUser && response.data.user) {
        updateUser(response.data.user);
      }

      setSettings(prev => ({
        ...prev,
        emailNotifications: true
      }));
      localStorage.setItem('emailNotifications', 'true');
      setShowEmailModal(false);
      alert('Email успешно сохранен и уведомления включены');
    } catch (error) {
      console.error('Ошибка сохранения email:', error);
      alert('Не удалось сохранить email. Попробуйте позже.');
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="error-state">Необходима авторизация</div>
      </div>
    );
  }

  return (
    <div className="settings-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="settings-header">
        <h1>Настройки</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Профиль</h2>
          <Link to="/edit-profile" className="settings-item">
            <span className="settings-icon">👤</span>
            <span className="settings-label">Редактировать профиль</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/orders" className="settings-item">
            <span className="settings-icon">📦</span>
            <span className="settings-label">Мои заказы</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/favorites" className="settings-item">
            <span className="settings-icon">❤️</span>
            <span className="settings-label">Избранное</span>
            <span className="settings-arrow">→</span>
          </Link>
        </div>

        <div className="settings-section">
          <h2>Уведомления</h2>
          <div className="settings-item">
            <span className="settings-icon">🔔</span>
            <span className="settings-label">Push-уведомления</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={() => handleToggle('notifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="settings-item">
            <span className="settings-icon">📧</span>
            <span className="settings-label">Email-уведомления</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle('emailNotifications')}
              />
              <span className="toggle-slider"></span>
            </label>
            {user.email && (
              <span className="settings-hint">({user.email})</span>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h2>Внешний вид</h2>
          <div className="settings-item">
            <span className="settings-icon">🌙</span>
            <span className="settings-label">Темная тема</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => handleToggle('darkMode')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h2>Язык и регион</h2>
          <div className="settings-item">
            <span className="settings-icon">🌍</span>
            <span className="settings-label">Язык</span>
            <select
              value={settings.language}
              onChange={(e) => handleSelect('language', e.target.value)}
              className="settings-select"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="settings-item">
            <span className="settings-icon">💰</span>
            <span className="settings-label">Валюта</span>
            <select
              value={settings.currency}
              onChange={(e) => handleSelect('currency', e.target.value)}
              className="settings-select"
            >
              <option value="RUB">₽ RUB</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2>Помощь</h2>
          <Link to="/help" className="settings-item">
            <span className="settings-icon">❓</span>
            <span className="settings-label">Справка</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/support" className="settings-item">
            <span className="settings-icon">📞</span>
            <span className="settings-label">Связаться с поддержкой</span>
            <span className="settings-arrow">→</span>
          </Link>
        </div>

        {(user.role === 'admin' || user.role === 'superadmin') && (
          <div className="settings-section">
            <h2>Администрирование</h2>
            <Link to="/admin/products" className="settings-item">
              <span className="settings-icon">📦</span>
              <span className="settings-label">Модерация товаров</span>
              <span className="settings-arrow">→</span>
            </Link>
            <Link to="/notifications" className="settings-item">
              <span className="settings-icon">🔔</span>
              <span className="settings-label">Уведомления</span>
              <span className="settings-arrow">→</span>
            </Link>
          </div>
        )}
      </div>

      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Введите email адрес"
        size="small"
      >
        <div className="email-modal-content">
          <p>Для включения email уведомлений необходимо указать ваш email адрес.</p>
          <input
            type="email"
            placeholder="example@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="email-input"
            autoFocus
          />
          <div className="modal-buttons">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowEmailModal(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleEmailSubmit}
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
