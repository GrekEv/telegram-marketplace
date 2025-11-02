import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Search.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (query.trim()) {
      handleSearch(query);
    }
  }, []);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await api.get('/users/search', {
        params: { q: searchQuery, type: 'all' }
      });
      setProducts(response.data.products || []);
      setSellers(response.data.sellers || []);
      setSearchParams({ q: searchQuery });
    } catch (error) {
      console.error('Ошибка поиска:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <div className="search-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="search-header">
        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            placeholder="🔍 Поиск товаров и магазинов..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          <button type="submit" className="search-btn">Найти</button>
        </form>
      </div>

      {query.trim() && (
        <div className="search-tabs">
          <button
            className={`search-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Товары ({products.length})
          </button>
          <button
            className={`search-tab ${activeTab === 'sellers' ? 'active' : ''}`}
            onClick={() => setActiveTab('sellers')}
          >
            Магазины ({sellers.length})
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : query.trim() ? (
        <div className="search-results">
          {activeTab === 'products' ? (
            products.length > 0 ? (
              <div className="products-grid">
                {products.map((product) => {
                  const images = typeof product.images === 'string' 
                    ? JSON.parse(product.images || '[]')
                    : (product.images || []);
                  const mainImage = images[0] || null;
                  const price = parseFloat(product.price);
                  const discount = parseFloat(product.discount) || 0;
                  const finalPrice = price - (price * discount / 100);

                  return (
                    <Link key={product.id} to={`/product/${product.id}`} className="product-card">
                      {mainImage && (
                        <div className="product-image">
                          <img src={mainImage} alt={product.name} />
                        </div>
                      )}
                      <div className="product-info">
                        <h3 className="product-name">{product.name}</h3>
                        <div className="product-price">
                          {discount > 0 && (
                            <span className="old-price">{price.toLocaleString('ru-RU')} ₽</span>
                          )}
                          <span className="current-price">{finalPrice.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        {product.shop_name && (
                          <div className="product-shop">{product.shop_name}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="no-results">
                <div className="empty-icon">🔍</div>
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить запрос</p>
              </div>
            )
          ) : (
            sellers.length > 0 ? (
              <div className="sellers-list">
                {sellers.map((seller) => (
                  <Link key={seller.id} to={`/seller/${seller.id}`} className="seller-card">
                    <img 
                      src={seller.logo_url || '/default-avatar.png'} 
                      alt={seller.shop_name}
                      className="seller-avatar"
                    />
                    <div className="seller-info">
                      <h3 className="seller-name">{seller.shop_name}</h3>
                      <p className="seller-description">{seller.description || 'Нет описания'}</p>
                      <div className="seller-stats">
                        <span>Товаров: {seller.products_count || 0}</span>
                      </div>
                    </div>
                    <span className="seller-arrow">→</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <div className="empty-icon">🏪</div>
                <h3>Магазины не найдены</h3>
                <p>Попробуйте изменить запрос</p>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="search-placeholder">
          <div className="placeholder-icon">🔍</div>
          <h3>Начните поиск</h3>
          <p>Введите название товара или магазина в поле поиска</p>
        </div>
      )}
    </div>
  );
};

export default Search;

