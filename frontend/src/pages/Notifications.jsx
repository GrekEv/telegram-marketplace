import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState(() => {
    // Восстанавливаем вкладку из state при возврате
    return location.state?.tab || 'reports';
  });

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Обновляем активную вкладку при изменении location.state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    filterNotificationsByTab();
  }, [activeTab, allNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications', {
        params: { limit: 100 }
      });
      setAllNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread || 0);
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotificationsByTab = () => {
    let filtered = [];
    
    switch (activeTab) {
      case 'reports':
        filtered = allNotifications.filter(n => n.type === 'report' || n.type?.includes('report'));
        break;
      case 'seller_applications':
        filtered = allNotifications.filter(n => n.type === 'seller_application');
        break;
      case 'user_registrations':
        filtered = allNotifications.filter(n => n.type === 'user_registration' || (n.type === 'new_user' && n.title?.toLowerCase().includes('пользователь')));
        break;
      case 'partner_messages':
        filtered = allNotifications.filter(n => n.type === 'message' || n.type === 'partner_message' || n.type?.includes('message'));
        break;
      default:
        filtered = allNotifications;
    }
    
    setNotifications(filtered);
  };

  const handleNotificationClick = async (notification) => {
    // Отмечаем как прочитанное
    if (!notification.is_read) {
      try {
        await api.put(`/notifications/${notification.id}/read`);
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Ошибка отметки уведомления:', error);
      }
    }

    // Переходим на страницу заявки, если это заявка продавца
    if (notification.type === 'seller_application') {
      try {
        const data = typeof notification.data === 'string' 
          ? JSON.parse(notification.data) 
          : notification.data;
        if (data?.seller_id) {
          navigate(`/admin/seller-application/${data.seller_id}`);
        }
      } catch (error) {
        console.error('Ошибка обработки данных уведомления:', error);
      }
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) {
      e.stopPropagation();
    }
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
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      for (const id of unreadIds) {
        await api.put(`/notifications/${id}/read`);
      }
      setAllNotifications(prev => 
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      const newUnreadCount = allNotifications.filter(n => !unreadIds.includes(n.id) && !n.is_read).length;
      setUnreadCount(newUnreadCount);
    } catch (error) {
      console.error('Ошибка отметки всех уведомлений:', error);
    }
  };

  if (!user) {
    return (
      <div className="notifications-page">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'reports', label: 'Жалобы', icon: '⚠️' },
    { id: 'seller_applications', label: 'Регистрация магазина', icon: '🏪' },
    { id: 'user_registrations', label: 'Регистрации пользователей', icon: '👥' },
    { id: 'partner_messages', label: 'Сообщения от партнеров', icon: '💬' }
  ];

  const getUnreadCountForTab = (tabId) => {
    return notifications.filter(n => !n.is_read && getTabForNotification(n.type) === tabId).length;
  };

  const getTabForNotification = (type) => {
    if (type === 'report' || type?.includes('report')) return 'reports';
    if (type === 'seller_application') return 'seller_applications';
    if (type === 'user_registration' || type === 'new_user') return 'user_registrations';
    if (type === 'message' || type === 'partner_message' || type?.includes('message')) return 'partner_messages';
    return 'reports';
  };

  return (
    <div className="notifications-page fade-in">
      <TelegramBackButton />
      
      <div className="notifications-header">
        <h1>Уведомления</h1>
        {unreadCount > 0 && notifications.length > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="mark-all-read-btn"
          >
            Отметить все прочитанным
          </button>
        )}
      </div>

      <div className="notifications-tabs">
        {tabs.map(tab => {
          const tabUnreadCount = allNotifications.filter(n => !n.is_read && getTabForNotification(n.type) === tab.id).length;
          return (
            <button
              key={tab.id}
              className={`notification-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {tabUnreadCount > 0 && (
                <span className="tab-badge">{tabUnreadCount > 99 ? '99+' : tabUnreadCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const isClickable = notification.type === 'seller_application' && 
                               (user?.role === 'admin' || user?.role === 'superadmin');
            return (
              <div
                key={notification.id}
                className={`notification-card ${!notification.is_read ? 'unread' : ''} ${isClickable ? 'clickable' : ''}`}
                onClick={() => isClickable ? handleNotificationClick(notification) : handleMarkAsRead(notification.id, null)}
              >
                <div className="notification-card-content">
                  <div className="notification-card-title">
                    {notification.title}
                    {isClickable && <span className="click-hint">→</span>}
                  </div>
                  <div className="notification-card-message">
                    {notification.message}
                  </div>
                  <div className="notification-card-time">
                    {new Date(notification.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="notification-unread-indicator"></div>
                )}
              </div>
            );
          })
        ) : (
          <div className="no-notifications-state">
            <div className="empty-icon">
              {activeTab === 'reports' && '⚠️'}
              {activeTab === 'seller_applications' && '🏪'}
              {activeTab === 'user_registrations' && '👥'}
              {activeTab === 'partner_messages' && '💬'}
            </div>
            <h3>Нет уведомлений</h3>
            <p>
              {activeTab === 'reports' && 'Жалобы на товары, продавцов или комментарии появятся здесь'}
              {activeTab === 'seller_applications' && 'Заявки на регистрацию магазинов появятся здесь'}
              {activeTab === 'user_registrations' && 'Уведомления о новых пользователях появятся здесь'}
              {activeTab === 'partner_messages' && 'Сообщения от партнеров появятся здесь'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

