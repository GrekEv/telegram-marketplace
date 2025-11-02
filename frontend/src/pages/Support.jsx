import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Support.css';

const Support = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSupportAdmin();
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchMessages();
      // Обновляем сообщения каждые 3 секунды
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [adminId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSupportAdmin = async () => {
    try {
      const response = await api.get('/users/support-admin');
      setAdminId(response.data.admin_id);
    } catch (error) {
      console.error('Ошибка получения админа поддержки:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!adminId) return;
    
    try {
      const response = await api.get(`/messages/chat/${adminId}`);
      setMessages(response.data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !adminId || sending) return;

    try {
      setSending(true);
      await api.post('/messages', {
        receiver_id: adminId,
        text: messageText.trim()
      });

      setMessageText('');
      await fetchMessages();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert('Не удалось отправить сообщение. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="support-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!adminId) {
    return (
      <div className="support-page">
        <TelegramBackButton />
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Администратор не найден</h3>
          <p>Попробуйте позже</p>
        </div>
      </div>
    );
  }

  return (
    <div className="support-page fade-in">
      <TelegramBackButton />
      
      <div className="support-header">
        <h1>Поддержка</h1>
        <p className="support-subtitle">Чат со службой поддержки</p>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h3>Начните диалог</h3>
            <p>Напишите нам, и мы поможем вам решить любой вопрос</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => {
              const isOwn = message.sender_id === user?.id;
              return (
                <div key={message.id} className={`message ${isOwn ? 'message-own' : 'message-other'}`}>
                  <div className="message-bubble">
                    <p className="message-text">{message.text}</p>
                    <span className="message-time">
                      {new Date(message.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="message-input"
          placeholder="Введите сообщение..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sending}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!messageText.trim() || sending}
        >
          {sending ? '...' : '→'}
        </button>
      </form>
    </div>
  );
};

export default Support;

