import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Feed.css';

const Feed = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFeed();
  }, [category]);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/feed', {
        params: { category: category !== 'all' ? category : undefined }
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Ошибка загрузки ленты:', error);
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

      {/* Сетка товаров */}
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

      {products.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>Товары не найдены</h3>
          <p>Попробуйте изменить фильтры или поисковый запрос</p>
          <button onClick={fetchFeed} className="mt-3">
            Обновить ленту
          </button>
        </div>
      )}
    </div>
  );
};

export default Feed;
