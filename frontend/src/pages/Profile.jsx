import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleApply = async (e) => {
    e.preventDefault();
    
    if (!shopName.trim()) {
      setMessage('Название магазина обязательно');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await api.post('/sellers/apply', {
        shop_name: shopName,
        description
      });
      setMessage('Заявка отправлена на модерацию!');
      setShopName('');
      setDescription('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Ошибка отправки заявки');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="profile">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile fade-in">
      {/* Профиль пользователя */}
      <div className="profile-card">
        <div className="profile-header">
          <img 
            src={user.photo_url || '/default-avatar.png'} 
            alt={user.first_name}
            className="profile-avatar"
          />
          <h1>{user.first_name} {user.last_name}</h1>
          <p className="profile-username">@{user.username || 'без username'}</p>
          
          {user.role !== 'user' && (
            <span className={`role-badge role-${user.role}`}>
              {user.role === 'seller' ? '🏪 Продавец' :
               user.role === 'admin' ? '👮 Администратор' :
               user.role === 'superadmin' ? '👑 Суперадмин' : user.role}
            </span>
          )}
        </div>
      </div>

      {/* Заявка на продавца */}
      {user.role === 'user' && (
        <div className="become-seller-card">
          <div className="card-header">
            <span className="card-icon">🏪</span>
            <h2>Стать продавцом</h2>
          </div>
          
          <form onSubmit={handleApply} className="seller-form">
            <div className="form-group">
              <label>Название магазина *</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Введите название магазина"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Описание магазина</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Расскажите о вашем магазине..."
                rows="4"
              />
            </div>
            
            {message && (
              <div className={`message ${message.includes('Ошибка') ? 'error' : 'success'}`}>
                {message}
              </div>
            )}
            
            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? (
                <>
                  <span className="spinner-small"></span> Отправка...
                </>
              ) : (
                'Подать заявку'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Меню профиля */}
      <div className="profile-menu">
        <Link to="/edit-profile" className="profile-menu-item">
          <span className="menu-icon">✏️</span>
          <span className="menu-label">Редактирование профиля</span>
          <span className="menu-arrow">→</span>
        </Link>
        
        <Link to="/settings" className="profile-menu-item">
          <span className="menu-icon">⚙️</span>
          <span className="menu-label">Настройки</span>
          <span className="menu-arrow">→</span>
        </Link>
        
        <Link to="/orders" className="profile-menu-item">
          <span className="menu-icon">📦</span>
          <span className="menu-label">Мои заказы</span>
          <span className="menu-arrow">→</span>
        </Link>
        
        <Link to="/favorites" className="profile-menu-item">
          <span className="menu-icon">❤️</span>
          <span className="menu-label">Избранное</span>
          <span className="menu-arrow">→</span>
        </Link>
      </div>

      {/* Информация для существующих продавцов/админов */}
      {user.role !== 'user' && (
        <div className="profile-info-card">
          <div className="info-item">
            <span className="info-label">Роль:</span>
            <span className="info-value">{user.role}</span>
          </div>
          {user.role === 'seller' && (
            <Link to="/my-shop">
              <button className="primary-btn full-width">Управление магазином</button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;
