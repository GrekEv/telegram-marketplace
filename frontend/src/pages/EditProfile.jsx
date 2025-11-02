import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './EditProfile.css';

const EditProfile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        postal_code: user.postal_code || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.put('/auth/profile', formData);
      if (response.data.user) {
        updateUser(response.data.user);
        setMessage('Профиль успешно обновлен!');
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="edit-profile-page">
        <div className="error-state">Необходима авторизация</div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page fade-in" style={{ paddingBottom: '100px' }}>
      <TelegramBackButton />
      
      <div className="edit-profile-header">
        <h1>Редактирование профиля</h1>
      </div>

      <form onSubmit={handleSubmit} className="edit-profile-form">
        <div className="form-section">
          <h2>Личная информация</h2>
          
          <div className="form-group">
            <label htmlFor="first_name">Имя *</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              placeholder="Введите имя"
            />
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Фамилия</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Введите фамилию"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Телефон</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Адрес доставки</h2>
          
          <div className="form-group">
            <label htmlFor="city">Город</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Введите город"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Адрес</label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              placeholder="Улица, дом, квартира"
            />
          </div>

          <div className="form-group">
            <label htmlFor="postal_code">Почтовый индекс</label>
            <input
              type="text"
              id="postal_code"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleChange}
              placeholder="123456"
            />
          </div>
        </div>

        {message && (
          <div className={`form-message ${message.includes('Ошибка') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="btn-cancel"
          >
            Отменить
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-save"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;

