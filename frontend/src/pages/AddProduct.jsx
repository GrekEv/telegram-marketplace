import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './AddProduct.css';

const AddProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discount: '0',
    currency: 'RUB',
    tags: '',
    is_digital: false
  });
  
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 10) {
      setError('Максимум 10 изображений');
      return;
    }
    
    setImages(prev => [...prev, ...files]);
    
    // Создаем превью
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      setError('Название и цена обязательны');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('discount', formData.discount);
      data.append('currency', formData.currency);
      data.append('is_digital', formData.is_digital);
      
      // Теги как JSON массив
      const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      data.append('tags', JSON.stringify(tagsArray));
      
      // Добавляем изображения
      images.forEach((image) => {
        data.append('images', image);
      });

      await api.post('/sellers/products', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Товар добавлен и отправлен на модерацию!');
      
      // Перенаправляем в магазин через 2 секунды
      setTimeout(() => {
        navigate('/my-shop');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления товара');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role === 'user') {
    return (
      <div className="add-product">
        <div className="error-state">
          <p>У вас нет прав для добавления товаров</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-product fade-in">
      <div className="add-product-header">
        <button onClick={() => navigate('/my-shop')} className="back-btn">
          ← Назад
        </button>
        <h1>Добавить товар</h1>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        {/* Изображения */}
        <div className="form-section">
          <label className="section-label">Фотографии товара (до 10)</label>
          
          <div className="images-grid">
            {previews.map((preview, index) => (
              <div key={index} className="image-preview">
                <img src={preview} alt={`Preview ${index + 1}`} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="remove-image-btn"
                >
                  ✕
                </button>
              </div>
            ))}
            
            {images.length < 10 && (
              <label className="add-image-btn">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <span className="add-icon">+</span>
                <span>Добавить фото</span>
              </label>
            )}
          </div>
        </div>

        {/* Основная информация */}
        <div className="form-section">
          <div className="form-group">
            <label>Название товара *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Например: Беспроводные наушники"
              required
            />
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Подробное описание товара..."
              rows="6"
            />
          </div>
        </div>

        {/* Цена */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Цена *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="1000"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Валюта</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="RUB">₽ RUB</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="STARS">⭐ Stars</option>
              </select>
            </div>

            <div className="form-group">
              <label>Скидка %</label>
              <input
                type="number"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                placeholder="0"
                min="0"
                max="99"
              />
            </div>
          </div>
        </div>

        {/* Дополнительно */}
        <div className="form-section">
          <div className="form-group">
            <label>Теги (через запятую)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="электроника, наушники, беспроводные"
            />
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_digital"
                checked={formData.is_digital}
                onChange={handleChange}
              />
              <span>Цифровой товар</span>
            </label>
          </div>
        </div>

        {/* Сообщения */}
        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {/* Кнопка отправки */}
        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? (
            <>
              <span className="spinner-small"></span> Добавление...
            </>
          ) : (
            'Добавить товар'
          )}
        </button>

        <p className="form-note">
          * Товар будет отправлен на модерацию и появится в магазине после одобрения
        </p>
      </form>
    </div>
  );
};

export default AddProduct;

