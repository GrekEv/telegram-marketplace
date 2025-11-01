import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { initTelegramWebApp, isInTelegram } from './utils/telegram';
import Header from './components/Header';
import Feed from './pages/Feed';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import MyShop from './pages/MyShop';
import Profile from './pages/Profile';
import Login from './pages/Login';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Инициализация Telegram WebApp
    if (isInTelegram()) {
      initTelegramWebApp();
    }
    
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">🛒</div>
        <div className="spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
            <Route path="/my-shop" element={<MyShop />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

