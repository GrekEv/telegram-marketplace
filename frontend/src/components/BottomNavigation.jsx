import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BottomNavigation.css';

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="bottom-navigation">
      <Link 
        to="/" 
        className={`bottom-nav-item ${isActive('/') && 'active'}`}
      >
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Главная</span>
      </Link>
      
      <Link 
        to="/shops" 
        className={`bottom-nav-item ${isActive('/shops') && 'active'}`}
      >
        <span className="bottom-nav-icon">🏪</span>
        <span className="bottom-nav-label">Магазины</span>
      </Link>
      
      <Link 
        to="/cart" 
        className={`bottom-nav-item ${isActive('/cart') && 'active'}`}
      >
        <span className="bottom-nav-icon">🛒</span>
        <span className="bottom-nav-label">Корзина</span>
      </Link>
      
      <Link 
        to="/profile" 
        className={`bottom-nav-item ${isActive('/profile') && 'active'}`}
      >
        <span className="bottom-nav-icon">👤</span>
        <span className="bottom-nav-label">Профиль</span>
      </Link>
    </nav>
  );
};

export default BottomNavigation;

