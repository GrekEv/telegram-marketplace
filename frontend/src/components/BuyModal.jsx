import { useState } from 'react';
import Modal from './Modal';
import api from '../utils/api';
import './BuyModal.css';

const BuyModal = ({ isOpen, onClose, product }) => {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('stars');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!product) return null;

  const price = Math.round(product.price - (product.price * (product.discount / 100)));
  const totalPrice = price * quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/orders', {
        product_id: product.id,
        quantity,
        payment_method: paymentMethod,
        delivery_method: deliveryMethod || null,
        delivery_address: deliveryAddress || null,
        notes: notes || null
      });

      onClose();
      // Можно показать уведомление об успехе
      alert('Заказ создан! Ожидайте подтверждения от продавца.');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка создания заказа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Оформление заказа"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="buy-form">
        <div className="product-summary">
          <div className="product-image-small">
            {product.images && product.images[0] ? (
              <img src={product.images[0]} alt={product.name} />
            ) : (
              <span>📦</span>
            )}
          </div>
          <div className="product-info-small">
            <h3>{product.name}</h3>
            <div className="price-row">
              <span className="price">{totalPrice} {product.currency}</span>
              {quantity > 1 && (
                <span className="price-per-unit">
                  ({price} за шт.)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Количество</label>
          <div className="quantity-control">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="quantity-btn"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="quantity-input"
            />
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="quantity-btn"
            >
              +
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Способ оплаты *</label>
          <div className="payment-methods">
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="stars"
                checked={paymentMethod === 'stars'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="payment-label">
                <span className="payment-icon">⭐</span>
                Telegram Stars
              </span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="crypto"
                checked={paymentMethod === 'crypto'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="payment-label">
                <span className="payment-icon">₿</span>
                Криптовалюта
              </span>
            </label>
            <label className="payment-option">
              <input
                type="radio"
                name="payment"
                value="fiat"
                checked={paymentMethod === 'fiat'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="payment-label">
                <span className="payment-icon">💳</span>
                Фиат
              </span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Способ доставки</label>
          <select
            value={deliveryMethod}
            onChange={(e) => setDeliveryMethod(e.target.value)}
            className="form-input"
          >
            <option value="">Выберите способ доставки</option>
            <option value="cdek">СДЭК</option>
            <option value="post_russia">Почта России</option>
            <option value="pickup">Самовывоз</option>
            <option value="digital">Цифровая доставка</option>
          </select>
        </div>

        {deliveryMethod && deliveryMethod !== 'digital' && (
          <div className="form-group">
            <label>Адрес доставки</label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Укажите адрес доставки"
              rows="3"
              className="form-input"
            />
          </div>
        )}

        <div className="form-group">
          <label>Комментарий к заказу</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows="2"
            className="form-input"
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            Отмена
          </button>
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Оформление...' : `Заказать за ${totalPrice} ${product.currency}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default BuyModal;

