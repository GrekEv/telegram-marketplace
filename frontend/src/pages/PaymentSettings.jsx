import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import { showToast } from '../utils/toast';
import './PaymentSettings.css';

const PaymentSettings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState({
    stars: false,
    crypto: {
      enabled: false,
      address: '',
      network: 'USDT TRC-20'
    },
    fiat: {
      enabled: false,
      card: '',
      phone: '',
      bank: ''
    }
  });

  useEffect(() => {
    fetchPaymentSettings();
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get('/sellers/my-shop');
      
      // Проверяем что seller существует
      if (!response.data || !response.data.seller) {
        throw new Error('Магазин не найден');
      }
      
      const methods = response.data.seller.payment_methods || {};
      
      setPaymentMethods({
        stars: methods.stars || false,
        crypto: {
          enabled: methods.crypto?.enabled || false,
          address: methods.crypto?.address || '',
          network: methods.crypto?.network || 'USDT TRC-20'
        },
        fiat: {
          enabled: methods.fiat?.enabled || false,
          card: methods.fiat?.card || '',
          phone: methods.fiat?.phone || '',
          bank: methods.fiat?.bank || ''
        }
      });
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
      
      // Если магазин не найден, показываем сообщение и возвращаем на главную
      if (error.response?.status === 404 || error.message === 'Магазин не найден') {
        showToast('Сначала создайте магазин', 'error');
        setTimeout(() => navigate('/profile'), 2000);
      } else {
        showToast('Ошибка загрузки настроек оплаты', 'error');
      }
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/sellers/payment-methods', { payment_methods: paymentMethods });
      showToast('Способы оплаты обновлены', 'success');
      navigate('/settings');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showToast('Ошибка сохранения настроек', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user || (user.role !== 'seller' && user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="payment-settings-page">
        <TelegramBackButton />
        <div className="error-state">
          <div className="error-icon">🚫</div>
          <h3>Доступ запрещен</h3>
          <p>Эта страница доступна только продавцам</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="payment-settings-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-settings-page fade-in">
      <TelegramBackButton />
      
      <div className="payment-settings-header">
        <h1>Способы оплаты</h1>
        <p className="subtitle">Укажите способы оплаты, которые принимает ваш магазин</p>
      </div>

      <div className="payment-methods-container">
        {/* Telegram Stars */}
        <div className="payment-method-card">
          <div className="method-header">
            <div className="method-info">
              <span className="method-icon">⭐</span>
              <div>
                <h3>Telegram Stars</h3>
                <p className="method-description">Встроенная валюта Telegram</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={paymentMethods.stars}
                onChange={(e) => setPaymentMethods({
                  ...paymentMethods,
                  stars: e.target.checked
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Криптовалюта */}
        <div className="payment-method-card">
          <div className="method-header">
            <div className="method-info">
              <span className="method-icon">₿</span>
              <div>
                <h3>Криптовалюта</h3>
                <p className="method-description">USDT, BTC, ETH и другие</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={paymentMethods.crypto.enabled}
                onChange={(e) => setPaymentMethods({
                  ...paymentMethods,
                  crypto: { ...paymentMethods.crypto, enabled: e.target.checked }
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          {paymentMethods.crypto.enabled && (
            <div className="method-details">
              <div className="form-group">
                <label>Сеть</label>
                <select
                  value={paymentMethods.crypto.network}
                  onChange={(e) => setPaymentMethods({
                    ...paymentMethods,
                    crypto: { ...paymentMethods.crypto, network: e.target.value }
                  })}
                >
                  <option value="USDT TRC-20">USDT TRC-20</option>
                  <option value="USDT ERC-20">USDT ERC-20</option>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="TON">TON</option>
                </select>
              </div>
              <div className="form-group">
                <label>Адрес кошелька</label>
                <input
                  type="text"
                  placeholder="Введите адрес криптокошелька"
                  value={paymentMethods.crypto.address}
                  onChange={(e) => setPaymentMethods({
                    ...paymentMethods,
                    crypto: { ...paymentMethods.crypto, address: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Фиатные деньги */}
        <div className="payment-method-card">
          <div className="method-header">
            <div className="method-info">
              <span className="method-icon">💳</span>
              <div>
                <h3>Банковские карты и переводы</h3>
                <p className="method-description">Карты, СБП, банковские счета</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={paymentMethods.fiat.enabled}
                onChange={(e) => setPaymentMethods({
                  ...paymentMethods,
                  fiat: { ...paymentMethods.fiat, enabled: e.target.checked }
                })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          {paymentMethods.fiat.enabled && (
            <div className="method-details">
              <div className="form-group">
                <label>Номер карты</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={paymentMethods.fiat.card}
                  onChange={(e) => setPaymentMethods({
                    ...paymentMethods,
                    fiat: { ...paymentMethods.fiat, card: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Телефон (СБП)</label>
                <input
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  value={paymentMethods.fiat.phone}
                  onChange={(e) => setPaymentMethods({
                    ...paymentMethods,
                    fiat: { ...paymentMethods.fiat, phone: e.target.value }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Банковские реквизиты</label>
                <textarea
                  placeholder="Название банка, БИК, номер счета и другие реквизиты"
                  rows="3"
                  value={paymentMethods.fiat.bank}
                  onChange={(e) => setPaymentMethods({
                    ...paymentMethods,
                    fiat: { ...paymentMethods.fiat, bank: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <button 
        className="save-button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Сохранение...' : 'Сохранить изменения'}
      </button>
    </div>
  );
};

export default PaymentSettings;

