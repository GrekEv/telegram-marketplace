import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './MyOrders.css';

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my-orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
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

  if (!user) {
    return (
      <div className="my-orders-page">
        <div className="error-state">Необходима авторизация</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-orders-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="orders-header">
        <h1>Мои заказы</h1>
        <div className="orders-count">{orders.length} заказов</div>
      </div>

      <div className="orders-list">
        {orders.length > 0 ? (
          orders.map((order) => {
            const images = typeof order.images === 'string' 
              ? JSON.parse(order.images || '[]')
              : (order.images || []);
            const mainImage = images[0] || null;

            return (
              <Link 
                key={order.id} 
                to={`/order/${order.id}`}
                className="order-card"
              >
                <div className="order-card-content">
                  {mainImage && (
                    <div className="order-image">
                      <img src={mainImage} alt={order.product_name} />
                    </div>
                  )}
                  <div className="order-info">
                    <div className="order-header">
                      <h3 className="order-product-name">{order.product_name || 'Товар'}</h3>
                      <span className={`order-status ${getStatusClass(order.order_status)}`}>
                        {getStatusLabel(order.order_status)}
                      </span>
                    </div>
                    <div className="order-details">
                      <div className="order-detail-row">
                        <span className="detail-label">Магазин:</span>
                        <span className="detail-value">{order.shop_name || 'Не указан'}</span>
                      </div>
                      <div className="order-detail-row">
                        <span className="detail-label">Количество:</span>
                        <span className="detail-value">{order.quantity} шт.</span>
                      </div>
                      <div className="order-detail-row">
                        <span className="detail-label">Сумма:</span>
                        <span className="detail-value price">
                          {parseFloat(order.total_price).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      <div className="order-detail-row">
                        <span className="detail-label">Оплата:</span>
                        <span className={`detail-value payment-status payment-${order.payment_status}`}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </span>
                      </div>
                      <div className="order-detail-row">
                        <span className="detail-label">Дата:</span>
                        <span className="detail-value">
                          {new Date(order.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-arrow">→</div>
              </Link>
            );
          })
        ) : (
          <div className="no-orders-state">
            <div className="empty-icon">📦</div>
            <h3>Нет заказов</h3>
            <p>Вы еще не делали заказов</p>
            <Link to="/" className="btn-primary">
              Перейти к покупкам
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;

