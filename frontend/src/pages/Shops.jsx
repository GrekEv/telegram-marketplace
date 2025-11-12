import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import './Shops.css';

const Shops = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('rating');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSellers();
  }, [search, sort]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sellers/all', {
        params: {
          search,
          sort,
          limit: 50
        }
      });
      setSellers(response.data.sellers || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Ошибка загрузки магазинов:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Загрузка магазинов...</p>
      </div>
    );
  }

  return (
    <div className="shops-page fade-in">
      <div className="shops-header">
        <h1>🏪 Все магазины</h1>
        <p className="shops-count">Найдено магазинов: {total}</p>
      </div>

      {/* Поиск и фильтры */}
      <div className="shops-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Поиск магазинов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sort-buttons">
          <button
            className={`sort-btn ${sort === 'rating' ? 'active' : ''}`}
            onClick={() => setSort('rating')}
          >
            ⭐ По рейтингу
          </button>
          <button
            className={`sort-btn ${sort === 'sales' ? 'active' : ''}`}
            onClick={() => setSort('sales')}
          >
            🔥 По продажам
          </button>
          <button
            className={`sort-btn ${sort === 'newest' ? 'active' : ''}`}
            onClick={() => setSort('newest')}
          >
            🆕 Новые
          </button>
        </div>
      </div>

      {/* Список магазинов */}
      {sellers.length > 0 ? (
        <div className="shops-grid">
          {sellers.map((seller) => (
            <Link to={`/seller/${seller.id}`} key={seller.id} className="shop-card">
              {/* Баннер */}
              {seller.banner_url && (
                <div className="shop-banner">
                  <img src={seller.banner_url} alt={seller.shop_name} />
                </div>
              )}

              {/* Информация о магазине */}
              <div className="shop-content">
                <div className="shop-avatar-section">
                  <img
                    src={seller.logo_url || seller.photo_url || '/default-avatar.png'}
                    alt={seller.shop_name}
                    className="shop-avatar"
                  />
                  <div className="shop-main-info">
                    <h3 className="shop-name">{seller.shop_name}</h3>
                    <p className="shop-owner">
                      {seller.first_name} {seller.last_name}
                      {seller.username && <span> • @{seller.username}</span>}
                    </p>
                  </div>
                </div>

                {seller.description && (
                  <p className="shop-description">{seller.description}</p>
                )}

                {/* Статистика */}
                <div className="shop-stats">
                  <div className="stat-item">
                    <span className="stat-icon">⭐</span>
                    <span className="stat-value">
                      {seller.rating ? parseFloat(seller.rating).toFixed(1) : '0.0'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">📦</span>
                    <span className="stat-value">{seller.products_count || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">{seller.subscribers_count || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">🛒</span>
                    <span className="stat-value">{seller.total_sales || 0}</span>
                  </div>
                </div>

                {/* Уровень продавца */}
                <div className={`seller-level level-${seller.seller_level}`}>
                  {seller.seller_level === 'gold' && '👑 Золото'}
                  {seller.seller_level === 'silver' && '⭐ Серебро'}
                  {seller.seller_level === 'bronze' && '🥉 Бронза'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">🏪</span>
          <h2>Магазины не найдены</h2>
          <p>Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  );
};

export default Shops;

