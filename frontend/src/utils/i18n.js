// Переводы
const translations = {
  ru: {
    // Общие
    loading: 'Загрузка...',
    error: 'Ошибка',
    save: 'Сохранить',
    cancel: 'Отмена',
    delete: 'Удалить',
    edit: 'Редактировать',
    back: 'Назад',
    
    // Навигация
    home: 'Главная',
    search: 'Поиск',
    cart: 'Корзина',
    profile: 'Профиль',
    
    // Настройки
    settings: 'Настройки',
    profile: 'Профиль',
    appearance: 'Внешний вид',
    languageAndRegion: 'Язык и регион',
    administration: 'Администрирование',
    editProfile: 'Редактировать профиль',
    myOrders: 'Мои заказы',
    favorites: 'Избранное',
    notifications: 'Уведомления',
    pushNotifications: 'Push-уведомления',
    emailNotifications: 'Email-уведомления',
    darkTheme: 'Темная тема',
    language: 'Язык',
    currency: 'Валюта',
    help: 'Справка',
    contactSupport: 'Связаться с поддержкой',
    authRequired: 'Необходима авторизация',
    enterValidEmail: 'Введите корректный email адрес',
    emailSaveError: 'Не удалось сохранить email. Попробуйте позже.',
    
    // Справка
    helpTitle: 'Справка',
    faq: 'Часто задаваемые вопросы',
    needHelp: 'Нужна дополнительная помощь?',
    contactSupportText: 'Если вы не нашли ответ на свой вопрос, свяжитесь с нашей службой поддержки.',
    contactSupportButton: 'Связаться с поддержкой',
    
    // Поддержка
    support: 'Поддержка',
    supportSubtitle: 'Чат со службой поддержки',
    startChat: 'Начните диалог',
    startChatText: 'Напишите нам, и мы поможем вам решить любой вопрос',
    enterMessage: 'Введите сообщение...',
    
    // Email модальное окно
    enterEmail: 'Введите email адрес',
    enterEmailText: 'Для включения email уведомлений необходимо указать ваш email адрес.',
    emailSaved: 'Email успешно сохранен и уведомления включены',
    
    // Профиль
    becomeSeller: 'Стать продавцом',
    myShop: 'Мой магазин',
    
    // Заказы
    orders: 'Мои заказы',
    ordersCount: 'заказов',
    noOrders: 'Нет заказов',
    noOrdersText: 'Вы еще не делали заказов',
    goShopping: 'Перейти к покупкам',
    
    // Товары
    products: 'Товары',
    product: 'Товар',
    addToCart: 'Добавить в корзину',
    buy: 'Купить',
    price: 'Цена',
    quantity: 'Количество',
    
    // Корзина
    cart: 'Корзина',
    cartEmpty: 'Корзина пуста',
    cartEmptyText: 'Добавьте товары в корзину',
    total: 'Итого',
    checkout: 'Оформить заказ',
    
    // Магазины
    shop: 'Магазин',
    shops: 'Магазины',
    subscribe: 'Подписаться',
    unsubscribe: 'Отписаться',
    
    // Админ
    moderation: 'Модерация товаров',
    adminNotifications: 'Уведомления',
    supportRequests: 'Запросы поддержки'
  },
  en: {
    // General
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    
    // Navigation
    home: 'Home',
    search: 'Search',
    cart: 'Cart',
    profile: 'Profile',
    
    // Settings
    settings: 'Settings',
    profile: 'Profile',
    appearance: 'Appearance',
    languageAndRegion: 'Language & Region',
    administration: 'Administration',
    editProfile: 'Edit Profile',
    myOrders: 'My Orders',
    favorites: 'Favorites',
    notifications: 'Notifications',
    pushNotifications: 'Push Notifications',
    emailNotifications: 'Email Notifications',
    darkTheme: 'Dark Theme',
    language: 'Language',
    currency: 'Currency',
    help: 'Help',
    contactSupport: 'Contact Support',
    authRequired: 'Authorization required',
    enterValidEmail: 'Please enter a valid email address',
    emailSaveError: 'Failed to save email. Please try again later.',
    
    // Help
    helpTitle: 'Help',
    faq: 'Frequently Asked Questions',
    needHelp: 'Need Additional Help?',
    contactSupportText: 'If you haven\'t found the answer to your question, contact our support team.',
    contactSupportButton: 'Contact Support',
    
    // Support
    support: 'Support',
    supportSubtitle: 'Chat with support team',
    startChat: 'Start a conversation',
    startChatText: 'Write to us and we will help you solve any issue',
    enterMessage: 'Enter message...',
    
    // Email modal
    enterEmail: 'Enter Email Address',
    enterEmailText: 'To enable email notifications, you need to provide your email address.',
    emailSaved: 'Email saved successfully and notifications enabled',
    
    // Profile
    becomeSeller: 'Become a Seller',
    myShop: 'My Shop',
    
    // Orders
    orders: 'My Orders',
    ordersCount: 'orders',
    noOrders: 'No Orders',
    noOrdersText: 'You haven\'t placed any orders yet',
    goShopping: 'Go Shopping',
    
    // Products
    products: 'Products',
    product: 'Product',
    addToCart: 'Add to Cart',
    buy: 'Buy',
    price: 'Price',
    quantity: 'Quantity',
    
    // Cart
    cart: 'Cart',
    cartEmpty: 'Cart is Empty',
    cartEmptyText: 'Add products to your cart',
    total: 'Total',
    checkout: 'Checkout',
    
    // Shops
    shop: 'Shop',
    shops: 'Shops',
    subscribe: 'Subscribe',
    unsubscribe: 'Unsubscribe',
    
    // Admin
    moderation: 'Product Moderation',
    adminNotifications: 'Notifications',
    supportRequests: 'Support Requests'
  }
};

// Получить текущий язык из localStorage
export const getCurrentLanguage = () => {
  return localStorage.getItem('language') || 'ru';
};

// Установить язык
export const setLanguage = (lang) => {
  localStorage.setItem('language', lang);
  return lang;
};

// Получить перевод
export const t = (key, lang = null) => {
  const currentLang = lang || getCurrentLanguage();
  const keys = key.split('.');
  let value = translations[currentLang];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
};

export default translations;

