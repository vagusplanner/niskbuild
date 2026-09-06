import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const LANGUAGES = [
  { code: 'en', nativeName: 'English',  flag: '🇬🇧', rtl: false },
  { code: 'ar', nativeName: 'العربية',  flag: '🇸🇦', rtl: true  },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'tr', nativeName: 'Türkçe',   flag: '🇹🇷', rtl: false },
  { code: 'ur', nativeName: 'اردو',     flag: '🇵🇰', rtl: true  },
];

const MENU_WIDTH = 176; // w-44
const MENU_Z = 9999;

export default function LanguageSwitcher({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const currentCode = localStorage.getItem('vagus_language') || 'en';
  const currentLang = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

  const placeMenu = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    const estimatedHeight = 44 * LANGUAGES.length + 8;
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    let left = rect.left;
    // Prefer aligning to trigger; clamp into viewport
    if (left + MENU_WIDTH > window.innerWidth - pad) {
      left = Math.max(pad, rect.right - MENU_WIDTH);
    }
    left = Math.max(pad, Math.min(left, window.innerWidth - MENU_WIDTH - pad));

    const top = openUp
      ? Math.max(pad, rect.top - estimatedHeight - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - estimatedHeight - pad);

    setCoords({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    const onReposition = () => placeMenu();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleSelect = async (lang) => {
    setOpen(false);
    if (lang.code === currentCode) return;

    localStorage.setItem('vagus_language', lang.code);
    localStorage.setItem('i18nextLng', lang.code);

    document.documentElement.setAttribute('lang', lang.code);
    document.documentElement.setAttribute('dir', lang.rtl ? 'rtl' : 'ltr');
    const fontFamily = lang.rtl
      ? "'Amiri', 'Scheherazade New', serif"
      : "'DM Sans', system-ui, -apple-system, sans-serif";
    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;

    base44.entities.UserSettings.list()
      .then(settings => {
        if (settings.length > 0) {
          return base44.entities.UserSettings.update(settings[0].id, { language: lang.code });
        }
        return base44.entities.UserSettings.create({ language: lang.code });
      })
      .catch(() => {})
      .finally(() => window.location.reload());

    setTimeout(() => window.location.reload(), 800);
  };

  const menu = open && coords && typeof document !== 'undefined' && createPortal(
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: MENU_Z }}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        ref={menuRef}
        role="listbox"
        aria-label="Language"
        className="fixed rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl py-1"
        style={{
          zIndex: MENU_Z + 1,
          top: coords.top,
          left: coords.left,
          width: MENU_WIDTH,
          maxHeight: 'min(320px, calc(100vh - 16px))',
          overflowY: 'auto',
        }}
      >
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            role="option"
            aria-selected={currentCode === lang.code}
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
    </>,
    document.body
  );

  return (
    <div className={cn('relative', compact && 'flex-shrink-0')}>
      <button
        ref={triggerRef}
        type="button"
        title="Change language"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{currentLang.flag}</span>
      </button>
      {menu}
    </div>
  );
}
