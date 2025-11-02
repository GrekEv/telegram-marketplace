import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBadge from './NotificationBadge';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-text">Marketplace</span>
        </Link>
        
        <nav className="nav">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-text">Главная</span>
          </Link>
          
          {user ? (
            <>
              {(user.role === 'seller' || user.role === 'admin' || user.role === 'superadmin') ? (
                <Link 
                  to="/my-shop" 
                  className={`nav-link ${isActive('/my-shop') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🏪</span>
                  <span className="nav-text">Магазин</span>
                </Link>
              ) : (
                <Link 
                  to="/profile" 
                  className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                >
                  <span className="nav-icon">➕</span>
                  <span className="nav-text">Продавать</span>
                </Link>
              )}
              
              <NotificationBadge />
              
              <Link 
                to="/ai-chat" 
                className={`nav-link ${isActive('/ai-chat') ? 'active' : ''}`}
              >
                <span className="nav-icon">🤖</span>
                <span className="nav-text">ИИ</span>
              </Link>
              
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <Link 
                  to="/admin/products" 
                  className={`nav-link ${isActive('/admin/products') ? 'active' : ''}`}
                >
                  <span className="nav-icon">📦</span>
                  <span className="nav-text">Модерация</span>
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" className="nav-link">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">Войти</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
