import { useEffect } from 'react';

/**
 * Injects Google Fonts into <head> and applies the correct font-family
 * directly on document.body via inline style — bypasses all CSS/Tailwind specificity issues.
 */
export default function FontLoader() {
  useEffect(() => {
    const lang = localStorage.getItem('vagus_language') || 'en';
    const isRTL = lang === 'ar' || lang === 'ur';

    // 1. Inject Google Fonts link if not already present
    if (!document.getElementById('vagus-fonts')) {
      const link = document.createElement('link');
      link.id = 'vagus-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap';
      document.head.appendChild(link);
    }

    // 2. Apply font directly on html and body via inline style (highest specificity, no CSS needed)
    const fontFamily = isRTL
      ? "'Amiri', 'Scheherazade New', serif"
      : "'DM Sans', system-ui, -apple-system, sans-serif";

    document.documentElement.style.fontFamily = fontFamily;
    document.body.style.fontFamily = fontFamily;

    // 3. Ensure dir and lang are set correctly
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

    // 4. After font loads, re-apply to catch any race conditions
    const timeout = setTimeout(() => {
      document.documentElement.style.fontFamily = fontFamily;
      document.body.style.fontFamily = fontFamily;
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  return null;
}