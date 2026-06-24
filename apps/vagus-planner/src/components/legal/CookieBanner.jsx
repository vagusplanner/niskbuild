import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: true,
      accepted_date: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: false,
      accepted_date: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-[60] p-3 lg:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t-2 border-teal-500 shadow-2xl">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="flex items-start gap-2 lg:gap-3 flex-1">
            <Cookie className="w-5 h-5 lg:w-6 lg:h-6 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm lg:text-base mb-1">We use cookies</h3>
              <p className="text-xs lg:text-sm text-slate-600 dark:text-slate-400">
                We use essential cookies for authentication and app functionality. By clicking "Accept All," you also consent to analytics cookies to help us improve your experience.{' '}
                <Link to={createPageUrl('PrivacyPolicy')} className="text-teal-600 hover:underline">
                  Learn more
                </Link>
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              onClick={acceptEssential}
              variant="outline"
              size="sm"
              className="flex-1 md:flex-initial"
            >
              Essential Only
            </Button>
            <Button
              onClick={acceptAll}
              size="sm"
              className="flex-1 md:flex-initial bg-teal-600 hover:bg-teal-700"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}