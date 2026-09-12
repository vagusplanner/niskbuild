import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { Globe } from 'lucide-react';

/**
 * Account Preferences — language picker (same LanguageSwitcher used in Layout).
 */
export default function AccountLanguagePreference() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600" />
          Language
        </CardTitle>
        <CardDescription>App language and text direction (RTL when needed)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Display language</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Changing language reloads the app to apply translations.
            </p>
          </div>
          <div className="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 p-1">
            <LanguageSwitcher />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
