import { useTranslation } from 'react-i18next';
import './LanguageToggle.css';

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'zh-TW', label: '繁體中文' },
] as const;

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  function handleChange(lng: string) {
    i18n.changeLanguage(lng);
    try { localStorage.setItem('yeah_lang', lng); } catch { /* */ }
  }

  return (
    <div className="lang-toggle">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          className={`lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
          onClick={() => handleChange(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
