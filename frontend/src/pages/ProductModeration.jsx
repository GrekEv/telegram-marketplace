import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './ProductModeration.css';

const ProductModeration = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionAdvice, setRejectionAdvice] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && productId) {
      fetchProduct();
    }
  }, [user, productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/products/${productId}`);
      setProduct(response.data.product);
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      setError('Не удалось загрузить товар');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Вы уверены, что хотите одобрить этот товар?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/admin/products/${productId}/moderate`, {
        action: 'approve'
      });
      if (response.data?.message) {
        alert(response.data.message);
      }
      navigate('/admin/products');
    } catch (error) {
      console.error('Ошибка одобрения товара:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Не удалось одобрить товар';
      alert(errorMessage);
      setProcessing(false);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Пожалуйста, укажите причину отказа');
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/admin/products/${productId}/moderate`, {
        action: 'reject',
        rejection_reason: rejectionReason.trim(),
        rejection_advice: rejectionAdvice.trim() || null
      });
      if (response.data?.message) {
        alert(response.data.message);
      }
      navigate('/admin/products');
    } catch (error) {
      console.error('Ошибка отклонения товара:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Не удалось отклонить товар';
      alert(errorMessage);
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (!user) {
    return (
      <div className="product-moderation-page">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="product-moderation-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-moderation-page">
        <div className="error-state">
          <p>{error || 'Товар не найден'}</p>
        </div>
      </div>
    );
  }

  const isPending = product.status === 'pending';
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
  const tags = typeof product.tags === 'string' ? JSON.parse(product.tags) : (product.tags || []);

  return (
    <div className="product-moderation-page fade-in">
      <TelegramBackButton />
      
      <div className="moderation-header">
        <h1>Модерация товара</h1>
        <div className={`product-status status-${product.status}`}>
          <span className="product-id">ID: {product.id}</span>
          {product.status === 'pending' && 'На рассмотрении'}
          {product.status === 'approved' && 'Одобрен'}
          {product.status === 'rejected' && 'Отклонен'}
        </div>
      </div>

      <div className="moderation-content">
        <div className="moderation-section">
          <h2>Информация о продавце</h2>
          <div className="info-row">
            <span className="info-label">Магазин:</span>
            <span className="info-value">{product.shop_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Продавец:</span>
            <span className="info-value">
              {product.first_name} {product.last_name || ''} (@{product.username || 'не указан'})
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Telegram ID:</span>
            <span className="info-value">{product.telegram_id}</span>
          </div>
        </div>

        <div className="moderation-section">
          <h2>Информация о товаре</h2>
          <div className="info-row">
            <span className="info-label">ID товара:</span>
            <span className="info-value product-id-value">{product.id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Название:</span>
            <span className="info-value">{product.name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Описание:</span>
            <span className="info-value">{product.description || 'Описание не указано'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Цена:</span>
            <span className="info-value">
              {parseFloat(product.price).toLocaleString('ru-RU')} {product.currency || 'RUB'}
              {product.discount > 0 && (
                <span className="discount"> (скидка {product.discount}%)</span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Тип:</span>
            <span className="info-value">{product.is_digital ? 'Цифровой товар' : 'Физический товар'}</span>
          </div>
          {tags.length > 0 && (
            <div className="info-row">
              <span className="info-label">Теги:</span>
              <span className="info-value">
                {tags.map(tag => `#${tag}`).join(', ')}
              </span>
            </div>
          )}
          {images.length > 0 && (
            <div className="info-row">
              <span className="info-label">Изображения:</span>
              <div className="info-value">
                <div className="product-images">
                  {images.map((img, idx) => (
                    <img key={idx} src={img} alt={`${product.name} ${idx + 1}`} className="product-image" />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Дата создания:</span>
            <span className="info-value">
              {new Date(product.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>

        {product.rejection_reason && (
          <div className="moderation-section rejection-info">
            <h2>Причина отказа</h2>
            <div className="rejection-reason">
              <p><strong>Причина:</strong> {product.rejection_reason}</p>
              {product.rejection_advice && (
                <p><strong>Советы по исправлению:</strong> {product.rejection_advice}</p>
              )}
            </div>
          </div>
        )}

        {isPending && (
          <div className="moderation-actions">
            <button
              onClick={handleApprove}
              className="btn-approve"
              disabled={processing}
            >
              ✓ Одобрить
            </button>
            <button
              onClick={handleReject}
              className="btn-reject"
              disabled={processing}
            >
              ✗ Отклонить
            </button>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Отклонение товара</h2>
              <button
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="rejection_reason">
                  Причина отказа <span className="required">*</span>
                </label>
                <textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Укажите причину отказа..."
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="rejection_advice">Советы по исправлению</label>
                <textarea
                  id="rejection_advice"
                  value={rejectionAdvice}
                  onChange={(e) => setRejectionAdvice(e.target.value)}
                  placeholder="Дайте советы, как исправить товар..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-cancel"
                disabled={processing}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitReject}
                className="btn-submit-reject"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Обработка...' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductModeration;

