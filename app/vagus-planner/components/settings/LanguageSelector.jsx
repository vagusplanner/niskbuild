import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true }
];

export default function LanguageSelector({ value, onChange }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (value && value !== i18n.language) {
      i18n.changeLanguage(value);
    }
  }, [value, i18n]);

  useEffect(() => {
    // Handle RTL languages
    const currentLang = LANGUAGES.find(lang => lang.code === i18n.language);
    if (currentLang?.rtl) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = i18n.language;
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    onChange(langCode);
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-slate-400" />
        {t('settings.language')}
      </Label>
      <Select value={value || i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder={t('settings.selectLanguage')} />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(lang => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}