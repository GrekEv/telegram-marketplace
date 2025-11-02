import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import Modal from '../components/Modal';
import './Settings.css';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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

    // Синхронизируем язык с контекстом
    if (savedLanguage !== language) {
      setLanguage(savedLanguage);
    }

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
    
    // При изменении языка обновляем контекст
    if (key === 'language') {
      setLanguage(value);
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailInput.trim()) {
      alert(t('enterEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      alert(t('enterValidEmail'));
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
      alert(t('emailSaved'));
    } catch (error) {
      console.error('Ошибка сохранения email:', error);
      alert(t('emailSaveError'));
    }
  };

  if (!user) {
    return (
      <div className="settings-page">
        <div className="error-state">{t('authRequired')}</div>
      </div>
    );
  }

  return (
    <div className="settings-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="settings-header">
        <h1>{t('settings')}</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h2>{t('profile')}</h2>
          <Link to="/edit-profile" className="settings-item">
            <span className="settings-icon">👤</span>
            <span className="settings-label">{t('editProfile')}</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/orders" className="settings-item">
            <span className="settings-icon">📦</span>
            <span className="settings-label">{t('myOrders')}</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/favorites" className="settings-item">
            <span className="settings-icon">❤️</span>
            <span className="settings-label">{t('favorites')}</span>
            <span className="settings-arrow">→</span>
          </Link>
        </div>

        {(user.role === 'seller' || user.role === 'admin' || user.role === 'superadmin') && (
          <div className="settings-section">
            <h2>Магазин</h2>
            <Link to="/payment-settings" className="settings-item">
              <span className="settings-icon">💳</span>
              <span className="settings-label">Способы оплаты</span>
              <span className="settings-arrow">→</span>
            </Link>
          </div>
        )}

        <div className="settings-section">
          <h2>{t('notifications')}</h2>
          <div className="settings-item">
            <span className="settings-icon">🔔</span>
            <span className="settings-label">{t('pushNotifications')}</span>
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
            <span className="settings-label">{t('emailNotifications')}</span>
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
          <h2>{t('appearance')}</h2>
          <div className="settings-item">
            <span className="settings-icon">🌙</span>
            <span className="settings-label">{t('darkTheme')}</span>
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
          <h2>{t('languageAndRegion')}</h2>
          <div className="settings-item">
            <span className="settings-icon">🌍</span>
            <span className="settings-label">{t('language')}</span>
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
            <span className="settings-label">{t('currency')}</span>
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
          <h2>{t('help')}</h2>
          <Link to="/help" className="settings-item">
            <span className="settings-icon">❓</span>
            <span className="settings-label">{t('help')}</span>
            <span className="settings-arrow">→</span>
          </Link>
          <Link to="/support" className="settings-item">
            <span className="settings-icon">📞</span>
            <span className="settings-label">{t('contactSupport')}</span>
            <span className="settings-arrow">→</span>
          </Link>
        </div>

        {(user.role === 'admin' || user.role === 'superadmin') && (
          <div className="settings-section">
            <h2>{t('administration')}</h2>
            <Link to="/admin/products" className="settings-item">
              <span className="settings-icon">📦</span>
              <span className="settings-label">{t('moderation')}</span>
              <span className="settings-arrow">→</span>
            </Link>
            <Link to="/notifications" className="settings-item">
              <span className="settings-icon">🔔</span>
              <span className="settings-label">{t('adminNotifications')}</span>
              <span className="settings-arrow">→</span>
            </Link>
            <Link to="/admin/support-requests" className="settings-item">
              <span className="settings-icon">💬</span>
              <span className="settings-label">{t('supportRequests')}</span>
              <span className="settings-arrow">→</span>
            </Link>
          </div>
        )}
      </div>

      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={t('enterEmail')}
        size="small"
      >
        <div className="email-modal-content">
          <p>{t('enterEmailText')}</p>
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
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleEmailSubmit}
            >
              {t('save')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
