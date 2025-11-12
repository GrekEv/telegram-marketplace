import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './MyShop.css';

const MyShop = () => {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  const fetchShop = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sellers/my-shop');
      setShop(response.data.seller);
      setProducts(response.data.products || []);
      setCollections(response.data.collections || []);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Ошибка загрузки магазина:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="my-shop">
        <div className="no-shop-card">
          <div className="no-shop-icon">🏪</div>
          <h2>У вас нет магазина</h2>
          <p>Создайте свой магазин и начните продавать товары</p>
          <Link to="/profile">
            <button className="primary-btn">Стать продавцом</button>
          </Link>
        </div>
      </div>
    );
  }

  if (shop.status === 'pending') {
    return (
      <div className="my-shop">
        <div className="pending-card">
          <div className="pending-icon">⏳</div>
          <h2>Ваша заявка на рассмотрении</h2>
          <p>Мы проверим вашу заявку и свяжемся с вами в ближайшее время</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-shop fade-in">
      {/* Хедер магазина */}
      <div className="shop-header-card">
        {shop.banner_url && (
          <div className="shop-banner">
            <img src={shop.banner_url} alt={shop.shop_name} />
          </div>
        )}
        
        <div className="shop-info">
          <div className="shop-avatar-wrapper">
            <img 
              src={shop.logo_url || '/default-avatar.png'} 
              alt={shop.shop_name}
              className="shop-logo"
            />
          </div>
          
          <div className="shop-main">
            <h1>{shop.shop_name}</h1>
            {shop.description && <p>{shop.description}</p>}
            
            <div className="shop-actions">
              <Link to="/shop-settings">
                <button className="action-btn outline">Настройки</button>
              </Link>
              <Link to="/add-product">
                <button className="action-btn primary">Добавить товар</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="shop-stats">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{stats.total_products || 0}</div>
            <div className="stat-label">Всего товаров</div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✓</div>
            <div className="stat-value">{stats.approved_products || 0}</div>
            <div className="stat-label">Одобрено</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.pending_products || 0}</div>
            <div className="stat-label">На модерации</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-value">{stats.total_views || 0}</div>
            <div className="stat-label">Просмотров</div>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="shop-tabs">
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Товары ({products.length})
        </button>
        <button
          className={`tab ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          Коллекции ({collections.length})
        </button>
      </div>

      {/* Контент */}
      <div className="shop-content">
        {activeTab === 'products' && (
          <div className="products-list">
            {products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="product-item">
                  <div className="product-image">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="image-placeholder">📦</div>
                    )}
                  </div>
                  <div className="product-details">
                    <h3>{product.name}</h3>
                    <div className="product-meta">
                      <span className="price">{product.price} {product.currency}</span>
                      <span className={`status status-${product.status}`}>
                        {product.status === 'approved' ? '✓ Одобрено' : 
                         product.status === 'pending' ? '⏳ На модерации' : 
                         product.status === 'rejected' ? '✗ Отклонено' : '📦 Архив'}
                      </span>
                    </div>
                    <div className="product-stats-row">
                      <span>👁️ {product.views_count || 0}</span>
                      <span>❤️ {product.likes_count || 0}</span>
                      <span>🛒 {product.purchases_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📦</span>
                <h3>Товары не найдены</h3>
                <p>Начните продавать — добавьте свой первый товар!</p>
                <Link to="/add-product">
                  <button className="primary-btn-large mt-3">➕ Добавить первый товар</button>
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="collections-list">
            {collections.length > 0 ? (
              collections.map((collection) => (
                <div key={collection.id} className="collection-item">
                  {collection.logo_url && (
                    <img src={collection.logo_url} alt={collection.name} />
                  )}
                  <div className="collection-info">
                    <h3>{collection.name}</h3>
                    {collection.description && <p>{collection.description}</p>}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📁</span>
                <p>Коллекции не найдены</p>
                <button className="primary-btn mt-3">Создать коллекцию</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyShop;
