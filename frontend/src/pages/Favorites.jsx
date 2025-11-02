import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Favorites.css';

const Favorites = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      // Получаем все товары и фильтруем по лайкам
      const response = await api.get('/users/feed');
      const allProducts = response.data.products || [];
      // Фильтруем товары, у которых есть лайк
      const likedProducts = allProducts.filter(p => p.is_liked);
      setProducts(likedProducts);
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (productId) => {
    try {
      await api.post(`/users/products/${productId}/like`);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
    }
  };

  if (!user) {
    return (
      <div className="favorites-page">
        <div className="error-state">Необходима авторизация</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="favorites-header">
        <h1>Избранное</h1>
        <div className="favorites-count">{products.length} товаров</div>
      </div>

      <div className="favorites-grid">
        {products.length > 0 ? (
          products.map((product) => {
            const images = typeof product.images === 'string' 
              ? JSON.parse(product.images || '[]')
              : (product.images || []);
            const mainImage = images[0] || null;
            const price = parseFloat(product.price);
            const discount = parseFloat(product.discount) || 0;
            const finalPrice = price - (price * discount / 100);

            return (
              <div key={product.id} className="favorite-card">
                <Link to={`/product/${product.id}`} className="favorite-card-link">
                  {mainImage && (
                    <div className="favorite-image">
                      <img src={mainImage} alt={product.name} />
                    </div>
                  )}
                  <div className="favorite-info">
                    <h3 className="favorite-name">{product.name}</h3>
                    <div className="favorite-price">
                      {discount > 0 && (
                        <span className="old-price">{price.toLocaleString('ru-RU')} ₽</span>
                      )}
                      <span className="current-price">{finalPrice.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {product.shop_name && (
                      <div className="favorite-shop">{product.shop_name}</div>
                    )}
                  </div>
                </Link>
                <button
                  className="favorite-remove"
                  onClick={() => handleUnlike(product.id)}
                  aria-label="Удалить из избранного"
                >
                  ❌
                </button>
              </div>
            );
          })
        ) : (
          <div className="no-favorites-state">
            <div className="empty-icon">❤️</div>
            <h3>Нет избранных товаров</h3>
            <p>Добавьте товары в избранное, чтобы вернуться к ним позже</p>
            <Link to="/" className="btn-primary">
              Перейти к покупкам
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;

