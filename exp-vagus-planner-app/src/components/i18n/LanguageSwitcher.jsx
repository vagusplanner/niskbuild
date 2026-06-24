import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SDK } from '@/lib/custom-sdk.js';

const LANGUAGES = [
  { code: 'en', nativeName: 'English',  flag: '🇬🇧', rtl: false },
  { code: 'ar', nativeName: 'العربية',  flag: '🇸🇦', rtl: true  },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'tr', nativeName: 'Türkçe',   flag: '🇹🇷', rtl: false },
  { code: 'ur', nativeName: 'اردو',     flag: '🇵🇰', rtl: true  },
];

export default function LanguageSwitcher({ compact = false }) {
  const [open, setOpen] = useState(false);
  // Read from localStorage so it reflects the actual current state
  const currentCode = localStorage.getItem('vagus_language') || 'en';
  const currentLang = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

  const handleSelect = async (lang) => {
    setOpen(false);
    if (lang.code === currentCode) return;

    // 1. Save to localStorage immediately
    localStorage.setItem('vagus_language', lang.code);
    localStorage.setItem('i18nextLng', lang.code);

    // 2. Apply to DOM right now
    document.documentElement.setAttribute('lang', lang.code);
    document.documentElement.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');
    const fontFamily = lang.rtl
      ? "'Amiri', 'Scheherazade New', serif"
      : "'DM Sans', system-ui, -apple-system, sans-serif";
    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;

    // 3. Save to DB in background then reload (don't await — avoids abort on reload)
    SDK.entities.UserSettings.list()
      .then(settings => {
        if (settings.length > 0) {
          return SDK.entities.UserSettings.update(settings[0].id, { language: lang.code });
        } else {
          return SDK.entities.UserSettings.create({ language: lang.code });
        }
      })
      .catch(() => {})
      .finally(() => window.location.reload());

    // Fallback: reload after 800ms even if DB call hangs
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="relative">
      <button
        type="button"
        title="Change language"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{currentLang.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 overflow-hidden">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                  currentCode === lang.code
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <span className="text-base leading-none flex-shrink-0">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.nativeName}</span>
                {currentCode === lang.code && (
                  <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}