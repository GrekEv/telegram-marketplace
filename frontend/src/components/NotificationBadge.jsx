import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import './NotificationBadge.css';

const NotificationBadge = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Обновляем каждые 30 сек
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications', {
        params: { unread_only: true, limit: 10 }
      });
      setUnreadCount(response.data.unread || 0);
      
      if (isOpen) {
        const allResponse = await api.get('/notifications', {
          params: { limit: 20 }
        });
        setNotifications(allResponse.data.notifications || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const handleToggle = async () => {
    if (!isOpen) {
      const response = await api.get('/notifications', {
        params: { limit: 20 }
      });
      setNotifications(response.data.notifications || []);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-container">
      <button 
        className="notification-btn"
        onClick={handleToggle}
      >
        <span className="notification-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Уведомления</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="mark-all-read"
                >
                  Отметить все
                </button>
              )}
            </div>
            
            <div className="notification-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.created_at).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="unread-dot"></div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-notifications">
                  <span className="empty-icon">📭</span>
                  <p>Нет уведомлений</p>
                </div>
              )}
            </div>
          </div>
          <div className="notification-overlay" onClick={() => setIsOpen(false)}></div>
        </>
      )}
    </div>
  );
};

export default NotificationBadge;

