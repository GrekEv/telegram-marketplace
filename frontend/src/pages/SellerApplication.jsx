import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import TelegramBackButton from '../components/TelegramBackButton';
import './SellerApplication.css';

const SellerApplication = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionAdvice, setRejectionAdvice] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && sellerId) {
      fetchApplication();
    }
  }, [user, sellerId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/sellers/${sellerId}`);
      setApplication(response.data.seller);
    } catch (error) {
      console.error('Ошибка загрузки заявки:', error);
      setError('Не удалось загрузить заявку');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Вы уверены, что хотите одобрить эту заявку?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/admin/sellers/${sellerId}/approve`, {
        action: 'approve'
      });
      
      // Обновляем пользователя в контексте после одобрения
      const userResponse = await api.get('/auth/me');
      updateUser(userResponse.data.user);
      
      if (response.data?.message) {
        alert(response.data.message);
      }
      navigate('/notifications', { state: { tab: 'seller_applications' } });
    } catch (error) {
      console.error('Ошибка одобрения заявки:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Не удалось одобрить заявку';
      alert(errorMessage);
      setProcessing(false);
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleSubmitReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Пожалуйста, укажите причину отказа');
      return;
    }

    try {
      setProcessing(true);
      const response = await api.post(`/admin/sellers/${sellerId}/approve`, {
        action: 'reject',
        rejection_reason: rejectionReason.trim(),
        rejection_advice: rejectionAdvice.trim() || null
      });
      if (response.data?.message) {
        alert(response.data.message);
      }
      navigate('/notifications', { state: { tab: 'seller_applications' } });
    } catch (error) {
      console.error('Ошибка отклонения заявки:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Не удалось отклонить заявку';
      alert(errorMessage);
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (!user) {
    return (
      <div className="seller-application-page">
        <div className="error-state">
          <p>Необходима авторизация</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="seller-application-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="seller-application-page">
        <div className="error-state">
          <p>{error || 'Заявка не найдена'}</p>
        </div>
      </div>
    );
  }

  const isPending = application.status === 'pending';

  return (
    <div className="seller-application-page fade-in">
      <TelegramBackButton />
      
      <div className="application-header">
        <h1>Заявка на магазин</h1>
        <div className={`application-status status-${application.status}`}>
          {application.status === 'pending' && 'На рассмотрении'}
          {application.status === 'approved' && 'Одобрена'}
          {application.status === 'rejected' && 'Отклонена'}
        </div>
      </div>

      <div className="application-content">
        <div className="application-section">
          <h2>Информация о пользователе</h2>
          <div className="info-row">
            <span className="info-label">Имя:</span>
            <span className="info-value">
              {application.first_name} {application.last_name || ''}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Username:</span>
            <span className="info-value">@{application.username || 'не указан'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Telegram ID:</span>
            <span className="info-value">{application.telegram_id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Дата регистрации:</span>
            <span className="info-value">
              {new Date(application.user_created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        <div className="application-section">
          <h2>Информация о магазине</h2>
          <div className="info-row">
            <span className="info-label">Название магазина:</span>
            <span className="info-value">{application.shop_name}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Описание:</span>
            <span className="info-value">
              {application.description || 'Описание не указано'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Дата подачи заявки:</span>
            <span className="info-value">
              {new Date(application.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
        </div>

        {application.rejection_reason && (
          <div className="application-section rejection-info">
            <h2>Причина отказа</h2>
            <div className="rejection-reason">
              <p><strong>Причина:</strong> {application.rejection_reason}</p>
              {application.rejection_advice && (
                <p><strong>Советы по исправлению:</strong> {application.rejection_advice}</p>
              )}
            </div>
          </div>
        )}

        {isPending && (
          <div className="application-actions">
            <button
              onClick={handleApprove}
              className="btn-approve"
              disabled={processing}
            >
              ✓ Одобрить
            </button>
            <button
              onClick={handleReject}
              className="btn-reject"
              disabled={processing}
            >
              ✗ Отклонить
            </button>
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Отклонение заявки</h2>
              <button
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="rejection_reason">
                  Причина отказа <span className="required">*</span>
                </label>
                <textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Укажите причину отказа..."
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="rejection_advice">Советы по исправлению</label>
                <textarea
                  id="rejection_advice"
                  value={rejectionAdvice}
                  onChange={(e) => setRejectionAdvice(e.target.value)}
                  placeholder="Дайте советы, как исправить заявку..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-cancel"
                disabled={processing}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitReject}
                className="btn-submit-reject"
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Обработка...' : 'Отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerApplication;

