import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentLanguage, setLanguage as setLangStorage, t } from '../utils/i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getCurrentLanguage);

  const setLanguage = (lang) => {
    setLanguageState(lang);
    setLangStorage(lang);
    // Обновляем HTML атрибут для возможного использования в CSS
    document.documentElement.lang = lang;
  };

  const translate = (key) => {
    return t(key, language);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

