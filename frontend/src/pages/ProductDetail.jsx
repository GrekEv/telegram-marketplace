import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import BuyModal from '../components/BuyModal';
import TelegramBackButton from '../components/TelegramBackButton';
import { useHapticFeedback } from '../utils/hooks';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, reviews, comments
  const [imageIndex, setImageIndex] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const haptic = useHapticFeedback();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.product);
      setReviews(response.data.reviews || []);
      setComments(response.data.comments || []);
      setIsLiked(response.data.product.is_liked || false);
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      haptic('light');
      const response = await api.post(`/users/products/${id}/like`);
      setIsLiked(response.data.liked);
      if (product) {
        setProduct({
          ...product,
          likes_count: response.data.liked 
            ? product.likes_count + 1 
            : product.likes_count - 1
        });
      }
    } catch (error) {
      console.error('Ошибка лайка:', error);
      haptic('error');
    }
  };

  const handleBuy = () => {
    haptic('medium');
    setShowBuyModal(true);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-state">
        <div className="error-icon">❌</div>
        <h3>Товар не найден</h3>
        <Link to="/">
          <button>Вернуться на главную</button>
        </Link>
      </div>
    );
  }

  const price = Math.round(product.price - (product.price * (product.discount / 100)));
  const images = product.images || [];

  return (
    <div className="product-detail fade-in">
      <TelegramBackButton />

      {/* Галерея изображений */}
      <div className="product-gallery">
        {images.length > 0 ? (
          <>
            <div className="main-image">
              <img src={images[imageIndex]} alt={product.name} />
              {product.discount > 0 && (
                <span className="discount-badge-large">-{product.discount}%</span>
              )}
            </div>
            {images.length > 1 && (
              <div className="image-thumbnails">
                {images.map((img, index) => (
                  <button
                    key={index}
                    className={`thumbnail ${index === imageIndex ? 'active' : ''}`}
                    onClick={() => {
                      haptic('light');
                      setImageIndex(index);
                    }}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-image-large">
            <span className="placeholder-icon">📦</span>
          </div>
        )}
      </div>

      <div className="product-content">
        {/* Название и цена */}
        <div className="product-header">
          <h1 className="product-title">{product.name}</h1>
          
          <div className="price-section">
            <div className="price-main">
              <span className="price-value">{price}</span>
              <span className="price-currency">{product.currency}</span>
            </div>
            {product.discount > 0 && (
              <span className="price-old">{product.price} {product.currency}</span>
            )}
          </div>
        </div>

        {/* Действия */}
        <div className="product-actions">
          <button 
            onClick={handleLike} 
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
          >
            <span className="btn-icon">❤️</span>
            <span>{product.likes_count || 0}</span>
          </button>
          
          <button 
            onClick={handleBuy} 
            className="action-btn buy-btn primary"
          >
            <span className="btn-icon">🛒</span>
            <span>Купить</span>
          </button>
        </div>

        {/* Продавец */}
        <Link to={`/seller/${product.seller_id}`} className="seller-card">
          <img 
            src={product.seller_logo || '/default-avatar.png'} 
            alt={product.shop_name}
            className="seller-avatar"
          />
          <div className="seller-info">
            <div className="seller-name">{product.shop_name}</div>
            <div className="seller-username">@{product.seller_username}</div>
          </div>
          <span className="seller-arrow">→</span>
        </Link>

        {/* Статистика */}
        <div className="product-stats">
          <div className="stat-item">
            <span className="stat-icon">👁️</span>
            <div>
              <div className="stat-value">{product.views_count || 0}</div>
              <div className="stat-label">Просмотры</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔥</span>
            <div>
              <div className="stat-value">{product.purchases_count || 0}</div>
              <div className="stat-label">Покупки</div>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⭐</span>
            <div>
              <div className="stat-value">
                {reviews.length > 0 
                  ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <div className="stat-label">Рейтинг</div>
            </div>
          </div>
        </div>

        {/* Табы */}
        <div className="product-tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => {
              haptic('light');
              setActiveTab('info');
            }}
          >
            Описание
          </button>
          <button
            className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => {
              haptic('light');
              setActiveTab('reviews');
            }}
          >
            Отзывы ({reviews.length})
          </button>
          <button
            className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => {
              haptic('light');
              setActiveTab('comments');
            }}
          >
            Комментарии ({comments.length})
          </button>
        </div>

        {/* Контент табов */}
        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="product-description">
              {product.description ? (
                <p>{product.description}</p>
              ) : (
                <p className="no-description">Описание отсутствует</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-section">
              {reviews.length > 0 ? (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <img 
                          src={review.photo_url || '/default-avatar.png'} 
                          alt={review.username}
                          className="review-avatar"
                        />
                        <div className="review-author">
                          <div className="review-name">
                            {review.first_name} {review.last_name}
                          </div>
                          <div className="review-rating">
                            {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </div>
                        </div>
                      </div>
                      {review.text && <p className="review-text">{review.text}</p>}
                      {review.images && review.images.length > 0 && (
                        <div className="review-images">
                          {review.images.map((img, i) => (
                            <img key={i} src={img} alt={`Review ${i + 1}`} />
                          ))}
                        </div>
                      )}
                      <div className="review-date">
                        {new Date(review.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-reviews">
                  <span className="empty-icon">💬</span>
                  <p>Отзывов пока нет</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="comments-section">
              {comments.length > 0 ? (
                <div className="comments-list">
                  {comments.map((comment) => (
                    <div key={comment.id} className="comment-card">
                      <img 
                        src={comment.photo_url || '/default-avatar.png'} 
                        alt={comment.username}
                        className="comment-avatar"
                      />
                      <div className="comment-content">
                        <div className="comment-header">
                          <span className="comment-author">
                            {comment.first_name} {comment.last_name}
                          </span>
                          <span className="comment-date">
                            {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <p className="comment-text">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-comments">
                  <span className="empty-icon">💬</span>
                  <p>Комментариев пока нет</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно покупки */}
      <BuyModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        product={product}
      />
    </div>
  );
};

export default ProductDetail;
