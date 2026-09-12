import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun } from 'lucide-react';

/**
 * Account Preferences — editable theme (same persistence as Layout / ThemeToggle).
 * Default light; only 'dark' in localStorage enables dark mode.
 */
export default function AccountThemePreference() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    setTheme(saved === 'dark' ? 'dark' : 'light');
  }, []);

  const applyTheme = (newTheme) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {isDark ? <Moon className="w-4 h-4 text-indigo-500" /> : <Sun className="w-4 h-4 text-amber-500" />}
          Appearance
        </CardTitle>
        <CardDescription>Light or dark theme for the whole app</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="min-w-0">
            <Label htmlFor="account-theme-toggle" className="text-sm font-semibold">
              {isDark ? 'Dark mode' : 'Light mode'}
            </Label>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDark
                ? 'Dark backgrounds for low-light use'
                : 'Default light appearance across Vagus Planner'}
            </p>
          </div>
          <Switch
            id="account-theme-toggle"
            checked={isDark}
            onCheckedChange={(checked) => applyTheme(checked ? 'dark' : 'light')}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}
