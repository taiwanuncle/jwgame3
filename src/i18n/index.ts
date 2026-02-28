import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko';
import zhTw from './zhTw';

const savedLng = (() => {
  try { return localStorage.getItem('yeah_lang') || 'ko'; } catch { return 'ko'; }
})();

i18n.use(initReactI18next).init({
  resources: {
    ko,
    'zh-TW': zhTw,
  },
  lng: savedLng,
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
});

export default i18n;
