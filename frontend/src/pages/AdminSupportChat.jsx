import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './Support.css';

const AdminSupportChat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatUser();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchMessages();
      // Обновляем сообщения каждые 3 секунды
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatUser = async () => {
    try {
      const response = await api.get(`/auth/user/${userId}`);
      setChatUser(response.data.user);
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
    }
  };

  const fetchMessages = async () => {
    if (!userId || !user) return;
    
    try {
      const response = await api.get(`/messages/chat/${userId}`);
      setMessages(response.data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !userId || sending) return;

    try {
      setSending(true);
      await api.post('/messages', {
        receiver_id: userId,
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

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="support-page">
        <TelegramBackButton />
        <div className="error-state">
          <div className="error-icon">🚫</div>
          <h3>Доступ запрещен</h3>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="support-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const displayName = chatUser 
    ? (chatUser.first_name && chatUser.last_name 
        ? `${chatUser.first_name} ${chatUser.last_name}` 
        : chatUser.first_name || chatUser.username || 'Пользователь')
    : 'Пользователь';

  return (
    <div className="support-page fade-in">
      <TelegramBackButton />
      
      <div className="support-header">
        <div className="chat-user-info">
          {chatUser?.photo_url && (
            <img src={chatUser.photo_url} alt={displayName} className="chat-user-avatar" />
          )}
          <div>
            <h1>{displayName}</h1>
            {chatUser?.username && (
              <p className="chat-user-username">@{chatUser.username}</p>
            )}
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-icon">💬</div>
            <h3>Начните диалог</h3>
            <p>Напишите пользователю в ответ на его запрос</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => {
              const isOwn = message.sender_id === user.id;
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

export default AdminSupportChat;

