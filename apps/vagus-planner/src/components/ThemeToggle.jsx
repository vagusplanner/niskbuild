import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Theme toggle.
 * Default is LIGHT. Only use dark when the user has explicitly saved 'dark'
 * in localStorage (via this toggle). Do NOT follow prefers-color-scheme and
 * do NOT write a theme to localStorage on first paint — that was causing
 * macOS/iOS dark-mode users to get permanently stuck in dark after login
 * (ThemeToggle overwrote Layout's light default and persisted it).
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    const initialTheme = saved === 'dark' ? 'dark' : 'light';
    setTheme(initialTheme);
    applyTheme(initialTheme, { persist: false });
  }, []);

  const applyTheme = (newTheme, { persist = true } = {}) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.colorScheme = 'light';
    }
    if (persist) {
      localStorage.setItem('theme', newTheme);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme, { persist: true });
  };

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-lg transition-colors hover:bg-white/10"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-white" />
      ) : (
        <Sun className="w-5 h-5 text-white" />
      )}
    </Button>
  );
}
