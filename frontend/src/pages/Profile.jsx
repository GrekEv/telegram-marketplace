import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  
  // Данные магазина
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingShop, setLoadingShop] = useState(false);

  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'admin' || user.role === 'superadmin')) {
      fetchShop();
    }
  }, [user]);

  const fetchShop = async () => {
    try {
      setLoadingShop(true);
      const response = await api.get('/sellers/my-shop');
      setShop(response.data.seller);
      setProducts(response.data.products || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Ошибка загрузки магазина:', error);
    } finally {
      setLoadingShop(false);
    }
  };

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

  const renderProfileTab = () => (
    <>
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
      </div>
    </>
  );

  const renderShopTab = () => {
    if (loadingShop) {
      return (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      );
    }

    if (!shop) {
      return (
        <div className="no-shop-card">
          <div className="no-shop-icon">🏪</div>
          <h2>У вас нет магазина</h2>
          <p>Создайте свой магазин и начните продавать товары</p>
        </div>
      );
    }

    if (shop.status === 'pending') {
      return (
        <div className="pending-card">
          <div className="pending-icon">⏳</div>
          <h2>Ваша заявка на рассмотрении</h2>
          <p>Мы проверим вашу заявку и свяжемся с вами в ближайшее время</p>
        </div>
      );
    }

    return (
      <>
        {/* Информация о магазине */}
        <div className="shop-info-card">
          <div className="shop-header-compact">
            <img 
              src={shop.logo_url || '/default-avatar.png'} 
              alt={shop.shop_name}
              className="shop-avatar-small"
            />
            <div>
              <h2>{shop.shop_name}</h2>
              {shop.description && <p className="shop-desc">{shop.description}</p>}
            </div>
          </div>
          
          <div className="shop-actions-row">
            <button 
              onClick={() => navigate('/add-product')} 
              className="action-btn primary"
            >
              ➕ Добавить товар
            </button>
            <Link to="/my-shop">
              <button className="action-btn outline">Полное управление</button>
            </Link>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="shop-stats-compact">
            <div className="stat-item-compact">
              <span className="stat-label">Товаров</span>
              <span className="stat-value">{stats.total_products || 0}</span>
            </div>
            <div className="stat-item-compact">
              <span className="stat-label">Одобрено</span>
              <span className="stat-value success">{stats.approved_products || 0}</span>
            </div>
            <div className="stat-item-compact">
              <span className="stat-label">На модерации</span>
              <span className="stat-value warning">{stats.pending_products || 0}</span>
            </div>
            <div className="stat-item-compact">
              <span className="stat-label">Просмотров</span>
              <span className="stat-value">{stats.total_views || 0}</span>
            </div>
          </div>
        )}

        {/* Список товаров */}
        <div className="products-section">
          <h3>Мои товары</h3>
          {products.length > 0 ? (
            <div className="products-list-compact">
              {products.slice(0, 5).map((product) => (
                <div key={product.id} className="product-item-compact">
                  <div className="product-image-small">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="image-placeholder-small">📦</div>
                    )}
                  </div>
                  <div className="product-details-compact">
                    <h4>{product.name}</h4>
                    <div className="product-meta-compact">
                      <span className="price">{product.price} {product.currency}</span>
                      <span className={`status status-${product.status}`}>
                        {product.status === 'approved' ? '✓' : 
                         product.status === 'pending' ? '⏳' : '✗'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-compact">
              <p>Товары не найдены</p>
              <button 
                onClick={() => navigate('/add-product')}
                className="add-first-btn"
              >
                Добавить первый товар
              </button>
            </div>
          )}
          
          {products.length > 5 && (
            <Link to="/my-shop" className="view-all-link">
              Смотреть все {products.length} товаров →
            </Link>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="profile fade-in">
      {/* Табы */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Профиль
        </button>
        
        {(user.role === 'seller' || user.role === 'admin' || user.role === 'superadmin') && (
          <button
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            🏪 Мой магазин
          </button>
        )}
        
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Заказы
        </button>
        
        <button
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          ❤️ Избранное
        </button>
      </div>

      {/* Контент вкладок */}
      <div className="tab-content">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'shop' && renderShopTab()}
        {activeTab === 'orders' && (
          <div className="tab-placeholder">
            <span className="placeholder-icon">📦</span>
            <h3>Мои заказы</h3>
            <p>Здесь будут отображаться ваши заказы</p>
            <Link to="/orders">
              <button className="primary-btn">Перейти к заказам</button>
            </Link>
          </div>
        )}
        {activeTab === 'favorites' && (
          <div className="tab-placeholder">
            <span className="placeholder-icon">❤️</span>
            <h3>Избранное</h3>
            <p>Здесь будут ваши избранные товары</p>
            <Link to="/favorites">
              <button className="primary-btn">Перейти к избранному</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
