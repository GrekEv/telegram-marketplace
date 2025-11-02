import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './ProductModerationList.css';

const ProductModerationList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/products/pending');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="product-moderation-list-page">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin' && user.role !== 'superadmin') {
    return (
      <div className="product-moderation-list-page">
        <div className="error-state">
          <p>Доступ запрещен. Требуются права администратора.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="product-moderation-list-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-moderation-list-page fade-in">
      <TelegramBackButton />
      
      <div className="moderation-list-header">
        <h1>Товары на модерации</h1>
        <div className="products-count">
          Всего заявок: {products.length}
        </div>
      </div>

      <div className="products-list">
        {products.length > 0 ? (
          products.map((product) => {
            const images = typeof product.images === 'string' 
              ? JSON.parse(product.images) 
              : (product.images || []);
            const mainImage = images[0] || null;

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => navigate(`/admin/product-moderation/${product.id}`)}
              >
                <div className="product-card-content">
                  {mainImage && (
                    <div className="product-image-container">
                      <img src={mainImage} alt={product.name} className="product-thumbnail" />
                    </div>
                  )}
                  <div className="product-info">
                    <div className="product-header">
                      <h3 className="product-name">{product.name}</h3>
                      <span className="product-id-badge">ID: {product.id.substring(0, 8)}...</span>
                    </div>
                    <div className="product-details">
                      <div className="product-detail-row">
                        <span className="detail-label">Магазин:</span>
                        <span className="detail-value">{product.shop_name}</span>
                      </div>
                      <div className="product-detail-row">
                        <span className="detail-label">Продавец:</span>
                        <span className="detail-value">
                          {product.first_name} {product.last_name || ''} (@{product.username || 'N/A'})
                        </span>
                      </div>
                      <div className="product-detail-row">
                        <span className="detail-label">Цена:</span>
                        <span className="detail-value">
                          {parseFloat(product.price).toLocaleString('ru-RU')} {product.currency || 'RUB'}
                          {product.discount > 0 && (
                            <span className="discount"> (скидка {product.discount}%)</span>
                          )}
                        </span>
                      </div>
                      <div className="product-detail-row">
                        <span className="detail-label">Тип:</span>
                        <span className="detail-value">
                          {product.is_digital ? 'Цифровой' : 'Физический'}
                        </span>
                      </div>
                      <div className="product-detail-row">
                        <span className="detail-label">Создан:</span>
                        <span className="detail-value">
                          {new Date(product.created_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    {product.description && (
                      <div className="product-description">
                        {product.description.length > 100 
                          ? product.description.substring(0, 100) + '...'
                          : product.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="product-card-arrow">→</div>
              </div>
            );
          })
        ) : (
          <div className="no-products-state">
            <div className="empty-icon">📦</div>
            <h3>Нет товаров на модерации</h3>
            <p>Все товары обработаны</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductModerationList;

