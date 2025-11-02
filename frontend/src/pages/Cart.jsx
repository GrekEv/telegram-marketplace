import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Cart.css';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Временное хранилище корзины в localStorage
  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCart = (newCart) => {
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeFromCart = (productId) => {
    const newCart = cartItems.filter(item => item.product_id !== productId);
    updateCart(newCart);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const newCart = cartItems.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    );
    updateCart(newCart);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price);
      const discount = parseFloat(item.discount) || 0;
      const finalPrice = price - (price * discount / 100);
      return total + (finalPrice * item.quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      return;
    }

    setProcessing(true);
    try {
      // Создаем заказы для каждого товара
      for (const item of cartItems) {
        await api.post('/orders', {
          product_id: item.product_id,
          quantity: item.quantity,
          payment_method: 'stars', // По умолчанию
          delivery_method: item.delivery_method || null,
          delivery_address: item.delivery_address || null,
          notes: item.notes || null
        });
      }
      // Очищаем корзину
      updateCart([]);
      navigate('/orders');
    } catch (error) {
      console.error('Ошибка оформления заказа:', error);
      alert(error.response?.data?.error || 'Ошибка оформления заказа');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="cart-page">
        <div className="error-state">
          <p>Необходима авторизация</p>
          <Link to="/login" className="btn-primary">Войти</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cart-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="cart-page fade-in">
      <TelegramBackButton />
      
      <div className="cart-header">
        <h1>Корзина</h1>
        <div className="cart-count">{cartItems.length} {cartItems.length === 1 ? 'товар' : 'товаров'}</div>
      </div>

      <div className="cart-content">
        {cartItems.length > 0 ? (
          <>
            <div className="cart-items">
              {cartItems.map((item) => {
                const images = typeof item.images === 'string' 
                  ? JSON.parse(item.images || '[]')
                  : (item.images || []);
                const mainImage = images[0] || null;
                const price = parseFloat(item.price);
                const discount = parseFloat(item.discount) || 0;
                const finalPrice = price - (price * discount / 100);

                return (
                  <div key={item.product_id} className="cart-item">
                    <Link to={`/product/${item.product_id}`} className="cart-item-image-link">
                      {mainImage && (
                        <img src={mainImage} alt={item.name} className="cart-item-image" />
                      )}
                    </Link>
                    <div className="cart-item-info">
                      <Link to={`/product/${item.product_id}`} className="cart-item-name">
                        {item.name}
                      </Link>
                      <div className="cart-item-price">
                        {discount > 0 && (
                          <span className="old-price">{price.toLocaleString('ru-RU')} ₽</span>
                        )}
                        <span className="current-price">{finalPrice.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-control">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="quantity-btn"
                          >
                            −
                          </button>
                          <span className="quantity-value">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="quantity-btn"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="remove-btn"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Товаров:</span>
                <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} шт.</span>
              </div>
              <div className="summary-row total">
                <span>Итого:</span>
                <span className="total-price">{total.toLocaleString('ru-RU')} ₽</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={processing || cartItems.length === 0}
                className="checkout-btn"
              >
                {processing ? 'Оформление...' : 'Оформить заказ'}
              </button>
            </div>
          </>
        ) : (
          <div className="empty-cart-state">
            <div className="empty-icon">🛒</div>
            <h3>Корзина пуста</h3>
            <p>Добавьте товары в корзину, чтобы оформить заказ</p>
            <Link to="/" className="btn-primary">
              Перейти к покупкам
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;

