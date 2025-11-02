import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './SupportRequests.css';

const SupportRequests = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    // Обновляем каждые 5 секунд
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/messages/support-requests');
      setRequests(response.data.requests || []);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки запросов:', error);
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="support-requests-page">
        <TelegramBackButton />
        <div className="error-state">
          <div className="error-icon">🚫</div>
          <h3>Доступ запрещен</h3>
          <p>Эта страница доступна только администраторам</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="support-requests-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-requests-page fade-in">
      <TelegramBackButton />
      
      <div className="support-requests-header">
        <h1>Запросы поддержки</h1>
        <div className="requests-count">{requests.length} {requests.length === 1 ? 'запрос' : 'запросов'}</div>
      </div>

      <div className="requests-list">
        {requests.length > 0 ? (
          requests.map((request) => (
            <Link
              key={request.user_id}
              to={`/admin/support-chat/${request.user_id}`}
              className="request-card"
            >
              <div className="request-avatar">
                {request.photo_url ? (
                  <img src={request.photo_url} alt={request.first_name || request.username} />
                ) : (
                  <div className="avatar-placeholder">
                    {(request.first_name?.[0] || request.username?.[0] || '?').toUpperCase()}
                  </div>
                )}
                {request.unread_count > 0 && (
                  <span className="unread-badge">{request.unread_count}</span>
                )}
              </div>

              <div className="request-info">
                <div className="request-header">
                  <h3 className="request-name">
                    {request.first_name && request.last_name
                      ? `${request.first_name} ${request.last_name}`
                      : request.first_name || request.username || 'Пользователь'}
                  </h3>
                  <span className="request-time">{formatTime(request.last_message_time)}</span>
                </div>
                <p className="request-message">
                  {request.last_message?.length > 60
                    ? request.last_message.substring(0, 60) + '...'
                    : request.last_message}
                </p>
              </div>

              <span className="request-arrow">→</span>
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Нет запросов</h3>
            <p>Запросы от пользователей будут отображаться здесь</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportRequests;

