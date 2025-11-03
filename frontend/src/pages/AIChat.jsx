import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './AIChat.css';

const AIChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', text: input };
    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Отправляем сообщение вместе с историей для контекста
      const response = await api.post('/ai/chat', {
        message: currentInput,
        conversation_history: messages
      });

      const aiMessage = { role: 'assistant', text: response.data.response || response.data.answer || 'Извините, не удалось получить ответ' };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      const errorMessage = { 
        role: 'assistant', 
        text: error.response?.data?.error || 'Ошибка получения ответа от ИИ' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="ai-chat">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat fade-in">
      <TelegramBackButton />
      
      <div className="chat-header">
        <div className="chat-header-content">
          <span className="chat-icon">🤖</span>
          <div>
            <h1>ИИ-ассистент</h1>
            <p>Задайте вопрос о товарах, магазине или продажах</p>
          </div>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="empty-icon">💬</span>
            <p>Начните диалог с ИИ-ассистентом</p>
            <div className="suggestions">
              <button onClick={() => setInput('Как улучшить описание товара?')} className="suggestion-btn">
                Как улучшить описание товара?
              </button>
              <button onClick={() => setInput('Какие цены лучше установить?')} className="suggestion-btn">
                Какие цены лучше установить?
              </button>
              <button onClick={() => setInput('Как увеличить продажи?')} className="suggestion-btn">
                Как увеличить продажи?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.role === 'user' ? (
                  <>
                    <div className="message-avatar">👤</div>
                    <div className="message-bubble user">{msg.text}</div>
                  </>
                ) : (
                  <>
                    <div className="message-avatar">🤖</div>
                    <div className="message-bubble assistant">{msg.text}</div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble assistant loading">
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Задайте вопрос..."
          className="chat-input"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="chat-send-btn">
          ➤
        </button>
      </form>
    </div>
  );
};

export default AIChat;

