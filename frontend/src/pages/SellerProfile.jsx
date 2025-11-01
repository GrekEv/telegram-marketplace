import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './SellerProfile.css';

const SellerProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // products, collections

  useEffect(() => {
    fetchSeller();
  }, [id]);

  const fetchSeller = async () => {
    try {
      const response = await api.get(`/products/seller/${id}`);
      setSeller(response.data.seller);
      setProducts(response.data.products);
      setCollections(response.data.collections);
      setIsSubscribed(response.data.is_subscribed);
    } catch (error) {
      console.error('Ошибка загрузки продавца:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      const response = await api.post(`/users/subscribe/${id}`);
      setIsSubscribed(response.data.subscribed);
    } catch (error) {
      console.error('Ошибка подписки:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="error-state">
        <div className="error-icon">❌</div>
        <h3>Продавец не найден</h3>
        <Link to="/">
          <button>Вернуться на главную</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="seller-profile fade-in">
      {/* Баннер и аватар */}
      <div className="seller-header">
        {seller.banner_url && (
          <div className="seller-banner">
            <img src={seller.banner_url} alt={seller.shop_name} />
          </div>
        )}
        
        <div className="seller-info-card">
          <div className="seller-avatar-wrapper">
            <img 
              src={seller.logo_url || '/default-avatar.png'} 
              alt={seller.shop_name}
              className="seller-logo"
            />
            {seller.seller_level && (
              <span className={`level-badge ${seller.seller_level}`}>
                {seller.seller_level === 'gold' ? '🥇' : seller.seller_level === 'silver' ? '🥈' : '🥉'}
                {seller.seller_level}
              </span>
            )}
          </div>
          
          <div className="seller-main-info">
            <h1 className="seller-name">{seller.shop_name}</h1>
            {seller.description && (
              <p className="seller-description">{seller.description}</p>
            )}
          </div>

          {user && (
            <button 
              onClick={handleSubscribe}
              className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`}
            >
              {isSubscribed ? (
                <>
                  <span>✓</span> Подписан
                </>
              ) : (
                <>
                  <span>+</span> Подписаться
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="seller-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{seller.subscribers_count || 0}</div>
          <div className="stat-label">Подписчиков</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-value">{seller.total_sales || 0}</div>
          <div className="stat-label">Продаж</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">
            {seller.rating ? parseFloat(seller.rating).toFixed(1) : '0.0'}
          </div>
          <div className="stat-label">Рейтинг</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-value">{seller.total_reviews || 0}</div>
          <div className="stat-label">Отзывов</div>
        </div>
      </div>

      {/* Табы */}
      {collections.length > 0 && (
        <div className="seller-tabs">
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
      )}

      {/* Контент табов */}
      <div className="seller-content">
        {activeTab === 'products' && (
          <div className="products-section">
            {products.length > 0 ? (
              <div className="products-grid">
                {products.map((product) => (
                  <Link 
                    key={product.id} 
                    to={`/product/${product.id}`}
                    className="product-card"
                  >
                    <div className="product-image-wrapper">
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.name} className="product-image" />
                      ) : (
                        <div className="product-image-placeholder">
                          <span className="placeholder-icon">📦</span>
                        </div>
                      )}
                      {product.discount > 0 && (
                        <span className="discount-badge">-{product.discount}%</span>
                      )}
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-price-wrapper">
                        <span className="product-price">
                          {Math.round(product.price - (product.price * (product.discount / 100)))}
                        </span>
                        <span className="product-currency">{product.currency}</span>
                      </div>
                      <div className="product-likes">❤️ {product.likes_count || 0}</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📦</span>
                <p>Товары не найдены</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="collections-section">
            {collections.length > 0 ? (
              <div className="collections-grid">
                {collections.map((collection) => (
                  <div key={collection.id} className="collection-card">
                    {collection.logo_url ? (
                      <img src={collection.logo_url} alt={collection.name} className="collection-image" />
                    ) : (
                      <div className="collection-placeholder">
                        <span>📁</span>
                      </div>
                    )}
                    <div className="collection-info">
                      <h3>{collection.name}</h3>
                      {collection.description && (
                        <p>{collection.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📁</span>
                <p>Коллекции не найдены</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerProfile;
