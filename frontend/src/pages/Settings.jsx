import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TelegramBackButton from '../components/TelegramBackButton';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    darkMode: false,
    language: 'ru',
    currency: 'RUB'
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelect = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
          <div className="settings-item">
            <span className="settings-icon">❓</span>
            <span className="settings-label">Справка</span>
            <span className="settings-arrow">→</span>
          </div>
          <div className="settings-item">
            <span className="settings-icon">📞</span>
            <span className="settings-label">Связаться с поддержкой</span>
            <span className="settings-arrow">→</span>
          </div>
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
    </div>
  );
};

export default Settings;

