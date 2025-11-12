import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Feed.css';

const Feed = () => {
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (category === 'subscription') {
      fetchSubscriptions();
    } else {
      fetchFeed();
    }
  }, [category]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      
      // Загружаем товары
      const productsResponse = await api.get('/users/feed', {
        params: { category: category !== 'all' ? category : undefined }
      });
      
      // Загружаем магазины в зависимости от категории
      let sellersData = [];
      if (category === 'all' || category === 'recommended') {
        const sellersResponse = await api.get('/sellers/all', {
          params: { limit: 5, sort: 'rating' }
        });
        sellersData = sellersResponse.data.sellers || [];
      } else if (category === 'popular') {
        const sellersResponse = await api.get('/sellers/all', {
          params: { limit: 5, sort: 'sales' }
        });
        sellersData = sellersResponse.data.sellers || [];
      }
      
      setProducts(productsResponse.data.products);
      setSellers(sellersData);
    } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/subscriptions');
      setSellers(response.data.sellers || []);
      setProducts([]);
    } catch (error) {
      console.error('Ошибка загрузки подписок:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await api.get('/users/search', {
        params: { q: searchQuery, type: 'products' }
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Ошибка поиска:', error);
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

  return (
    <div className="feed fade-in">
      {/* Поиск */}
      <div className="feed-search">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="🔍 Поиск товаров и магазинов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(''); fetchFeed(); }} className="clear-search">
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Категории ленты */}
      <div className="feed-categories">
        <div className="categories-scroll">
          <button
            className={`category-btn ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            Все
          </button>
          <button
            className={`category-btn ${category === 'recommended' ? 'active' : ''}`}
            onClick={() => setCategory('recommended')}
          >
            ⭐ Рекомендуем
          </button>
          <button
            className={`category-btn ${category === 'subscription' ? 'active' : ''}`}
            onClick={() => setCategory('subscription')}
          >
            👥 Подписки
          </button>
          <button
            className={`category-btn ${category === 'popular' ? 'active' : ''}`}
            onClick={() => setCategory('popular')}
          >
            🔥 Популярное
          </button>
          <button
            className={`category-btn ${category === 'promoted' ? 'active' : ''}`}
            onClick={() => setCategory('promoted')}
          >
            💎 Продвигаемые
          </button>
        </div>
      </div>

      {/* Магазины в ленте (если есть) */}
      {sellers.length > 0 && category !== 'subscription' && (
        <div className="feed-shops-section">
          <div className="section-header-inline">
            <h3>🏪 Магазины</h3>
            <Link to="/shops" className="see-all-link-small">Все →</Link>
          </div>
          <div className="shops-feed-grid">
            {sellers.map((seller) => (
              <Link
                key={seller.id}
                to={`/seller/${seller.id}`}
                className="seller-card-feed-compact"
              >
                <div className="seller-compact-image">
                  {seller.logo_url || seller.photo_url ? (
                    <img src={seller.logo_url || seller.photo_url} alt={seller.shop_name} />
                  ) : (
                    <div className="seller-image-placeholder-compact">🏪</div>
                  )}
                </div>
                <div className="seller-compact-details">
                  <h4>{seller.shop_name}</h4>
                  <div className="seller-compact-stats">
                    <span>⭐ {seller.rating ? parseFloat(seller.rating).toFixed(1) : '0.0'}</span>
                    <span>•</span>
                    <span>📦 {seller.products_count || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Сетка товаров или магазинов */}
      {category === 'subscription' ? (
        <div className="sellers-grid">
          {sellers.map((seller) => (
            <Link
              key={seller.id}
              to={`/seller/${seller.id}`}
              className="seller-card-feed"
            >
              <div className="seller-image-wrapper">
                {seller.logo_url ? (
                  <img src={seller.logo_url} alt={seller.shop_name} className="seller-image" />
                ) : (
                  <div className="seller-image-placeholder">
                    <span className="placeholder-icon">🏪</span>
                  </div>
                )}
                {seller.banner_url && (
                  <div className="seller-banner">
                    <img src={seller.banner_url} alt={seller.shop_name} />
                  </div>
                )}
              </div>

              <div className="seller-info">
                <h3 className="seller-name" title={seller.shop_name}>
                  {seller.shop_name}
                </h3>
                
                {seller.description && (
                  <p className="seller-description" title={seller.description}>
                    {seller.description.length > 100 
                      ? seller.description.substring(0, 100) + '...' 
                      : seller.description}
                  </p>
                )}
                
                <div className="seller-stats">
                  <span className="seller-stat">
                    <span className="stat-icon">📦</span>
                    <span>{seller.products_count || 0} товаров</span>
                  </span>
                  <span className="seller-stat">
                    <span className="stat-icon">👥</span>
                    <span>{seller.subscribers_count || 0} подписчиков</span>
                  </span>
                </div>

                {seller.rating > 0 && (
                  <div className="seller-rating">
                    <span className="rating-stars">
                      {'⭐'.repeat(Math.round(seller.rating))}
                      {'☆'.repeat(5 - Math.round(seller.rating))}
                    </span>
                    <span className="rating-value">{seller.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="product-card"
            >
              <div className="product-image-wrapper">
                {(() => {
                  const images = typeof product.images === 'string' 
                    ? JSON.parse(product.images || '[]') 
                    : (product.images || []);
                  const mainImage = images[0];
                  return mainImage ? (
                    <img src={mainImage} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">
                      <span className="placeholder-icon">📦</span>
                    </div>
                  );
                })()}
                
                {product.feed_category === 'promoted' && (
                  <span className="promoted-badge">
                    <span className="star-icon">⭐</span> Продвигается
                  </span>
                )}
                
                {product.discount > 0 && (
                  <span className="discount-badge">
                    -{product.discount}%
                  </span>
                )}
              </div>

              <div className="product-info">
                <h3 className="product-name" title={product.name}>
                  {product.name}
                </h3>
                
                <div className="product-seller">
                  <span className="seller-name">{product.shop_name}</span>
                </div>

                <div className="product-footer">
                  <div className="product-price-wrapper">
                    <span className="product-price">
                      {Math.round(product.price - (product.price * (product.discount / 100)))}
                    </span>
                    <span className="product-currency">{product.currency}</span>
                    {product.discount > 0 && (
                      <span className="product-old-price">{product.price} {product.currency}</span>
                    )}
                  </div>
                  
                  <div className="product-stats">
                    <span className="product-likes">
                      ❤️ {product.likes_count || 0}
                    </span>
                    {product.purchases_count > 0 && (
                      <span className="product-sales">
                        🔥 {product.purchases_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(category === 'subscription' ? sellers.length === 0 : products.length === 0) && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>{category === 'subscription' ? 'Нет подписок' : 'Товары не найдены'}</h3>
          <p>
            {category === 'subscription' 
              ? 'Подпишитесь на магазины, чтобы видеть их здесь' 
              : 'Попробуйте изменить фильтры или поисковый запрос'}
          </p>
          {category !== 'subscription' && (
            <button onClick={fetchFeed} className="mt-3">
              Обновить ленту
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Feed;
