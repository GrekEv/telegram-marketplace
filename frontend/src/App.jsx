import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { initTelegramWebApp, isInTelegram } from './utils/telegram';
import Header from './components/Header';
import Feed from './pages/Feed';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import MyShop from './pages/MyShop';
import Shops from './pages/Shops';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import SellerApplication from './pages/SellerApplication';
import ProductModerationList from './pages/ProductModerationList';
import ProductModeration from './pages/ProductModeration';
import EditProfile from './pages/EditProfile';
import Settings from './pages/Settings';
import PaymentSettings from './pages/PaymentSettings';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import Favorites from './pages/Favorites';
import Cart from './pages/Cart';
import Search from './pages/Search';
import AIChat from './pages/AIChat';
import Help from './pages/Help';
import Support from './pages/Support';
import SupportRequests from './pages/SupportRequests';
import AdminSupportChat from './pages/AdminSupportChat';
import BottomNavigation from './components/BottomNavigation';

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
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Header />
            <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/seller/:id" element={<SellerProfile />} />
            <Route path="/shops" element={<Shops />} />
            <Route path="/my-shop" element={<MyShop />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/payment-settings" element={<PaymentSettings />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/order/:id" element={<OrderDetail />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/search" element={<Search />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<Support />} />
            <Route path="/login" element={<Login />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin/seller-application/:sellerId" element={<SellerApplication />} />
            <Route path="/admin/products" element={<ProductModerationList />} />
            <Route path="/admin/product-moderation/:productId" element={<ProductModeration />} />
            <Route path="/admin/support-requests" element={<SupportRequests />} />
            <Route path="/admin/support-chat/:userId" element={<AdminSupportChat />} />
          </Routes>
          <BottomNavigation />
        </div>
      </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;

