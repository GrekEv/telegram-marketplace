import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './NotificationBadge.css';

const NotificationBadge = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications', {
        params: { unread_only: true, limit: 10 }
      });
      setUnreadCount(response.data.unread || 0);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  if (!user) return null;

  const isActive = location.pathname === '/notifications';

  return (
    <Link 
      to="/notifications" 
      className={`notification-container ${isActive ? 'active' : ''}`}
    >
      <div className="notification-btn">
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </div>
    </Link>
  );
};

export default NotificationBadge;

