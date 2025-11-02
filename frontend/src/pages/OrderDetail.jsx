import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import { useHapticFeedback } from '../utils/hooks';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const haptic = useHapticFeedback();

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Ошибка загрузки заказа:', error);
      setError(error.response?.data?.error || 'Не удалось загрузить заказ');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'Новый',
      confirmed: 'Подтвержден',
      preparing: 'Готовится',
      shipped: 'Отправлен',
      delivered: 'Доставлен',
      cancelled: 'Отменен'
    };
    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      new: 'status-new',
      confirmed: 'status-confirmed',
      preparing: 'status-preparing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      not_paid: 'Не оплачен',
      paid: 'Оплачен',
      confirmed: 'Подтвержден'
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      stars: '⭐ Telegram Stars',
      crypto: '💎 Криптовалюта',
      fiat: '💳 Фиат'
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <TelegramBackButton />
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>{error || 'Заказ не найден'}</h3>
          <Link to="/orders">
            <button className="btn-primary">Вернуться к заказам</button>
          </Link>
        </div>
      </div>
    );
  }

  const productImages = typeof order.product_images === 'string' 
    ? JSON.parse(order.product_images || '[]') 
    : (order.product_images || []);
  const mainImage = productImages[0] || null;

  const finalPrice = order.product_price - (order.product_price * ((order.product_discount || 0) / 100));

  return (
    <div className="order-detail-page fade-in">
      <TelegramBackButton />

      <div className="order-header">
        <h1>Заказ #{order.id.substring(0, 8)}</h1>
        <span className={`order-status-badge ${getStatusClass(order.order_status)}`}>
          {getStatusLabel(order.order_status)}
        </span>
      </div>

      {/* Товар */}
      {order.product_id && (
        <Link to={`/product/${order.product_id}`} className="product-section">
          <div className="product-image-wrapper">
            {mainImage ? (
              <img src={mainImage} alt={order.product_name} className="product-image" />
            ) : (
              <div className="product-image-placeholder">
                <span className="placeholder-icon">📦</span>
              </div>
            )}
            {order.product_discount > 0 && (
              <span className="discount-badge">
                -{order.product_discount}%
              </span>
            )}
          </div>

          <div className="product-info-section">
            <h2 className="product-name">{order.product_name || 'Товар'}</h2>
            {order.product_description && (
              <p className="product-description">{order.product_description}</p>
            )}
            
            <div className="product-price-info">
              <span className="price-label">Цена:</span>
              <span className="price-value">
                {finalPrice.toLocaleString('ru-RU')} {order.product_currency || 'RUB'}
              </span>
              {order.product_discount > 0 && (
                <span className="old-price">
                  {order.product_price.toLocaleString('ru-RU')} {order.product_currency || 'RUB'}
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Информация о заказе */}
      <div className="order-info-section">
        <h3 className="section-title">Информация о заказе</h3>
        
        <div className="info-row">
          <span className="info-label">Количество:</span>
          <span className="info-value">{order.quantity} шт.</span>
        </div>

        <div className="info-row">
          <span className="info-label">Сумма:</span>
          <span className="info-value price">
            {parseFloat(order.total_price).toLocaleString('ru-RU')} {order.product_currency || 'RUB'}
          </span>
        </div>

        <div className="info-row">
          <span className="info-label">Способ оплаты:</span>
          <span className="info-value">{getPaymentMethodLabel(order.payment_method)}</span>
        </div>

        <div className="info-row">
          <span className="info-label">Статус оплаты:</span>
          <span className={`info-value payment-status payment-${order.payment_status}`}>
            {getPaymentStatusLabel(order.payment_status)}
          </span>
        </div>

        {order.delivery_method && (
          <div className="info-row">
            <span className="info-label">Доставка:</span>
            <span className="info-value">{order.delivery_method}</span>
          </div>
        )}

        {order.delivery_address && (
          <div className="info-row">
            <span className="info-label">Адрес доставки:</span>
            <span className="info-value">{order.delivery_address}</span>
          </div>
        )}

        {order.transaction_hash && (
          <div className="info-row">
            <span className="info-label">Хеш транзакции:</span>
            <span className="info-value transaction-hash">{order.transaction_hash}</span>
          </div>
        )}

        {order.payment_proof && (
          <div className="info-row">
            <span className="info-label">Подтверждение оплаты:</span>
            <img src={order.payment_proof} alt="Подтверждение оплаты" className="payment-proof" />
          </div>
        )}

        {order.notes && (
          <div className="info-row">
            <span className="info-label">Примечания:</span>
            <span className="info-value">{order.notes}</span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Дата заказа:</span>
          <span className="info-value">
            {new Date(order.created_at).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {order.updated_at && order.updated_at !== order.created_at && (
          <div className="info-row">
            <span className="info-label">Последнее обновление:</span>
            <span className="info-value">
              {new Date(order.updated_at).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
      </div>

      {/* Информация о магазине */}
      {order.seller_id && (
        <Link to={`/seller/${order.seller_id}`} className="seller-section">
          <div className="seller-header">
            <h3 className="section-title">Магазин</h3>
          </div>
          <div className="seller-info-row">
            {order.seller_logo && (
              <img src={order.seller_logo} alt={order.shop_name} className="seller-logo-small" />
            )}
            <div className="seller-details">
              <div className="seller-name">{order.shop_name}</div>
              {order.seller_username && (
                <div className="seller-username">@{order.seller_username}</div>
              )}
            </div>
            <span className="arrow">→</span>
          </div>
        </Link>
      )}
    </div>
  );
};

export default OrderDetail;

