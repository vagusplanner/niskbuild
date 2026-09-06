import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Legacy Islamic page — Quran (and other) surfaces consolidated into Islam hub.
 * Same pattern as ZakatDashboard / IslamicFinance → Islam?section=zakat.
 */
export default function Islamic() {
  const navigate = useNavigate();
  useEffect(() => {
    const tab = (() => {
      try {
        return new URLSearchParams(window.location.search).get('tab');
      } catch {
        return null;
      }
    })();
    if (tab === 'quran') {
      navigate(`${createPageUrl('Islam')}?section=quran`, { replace: true });
    } else {
      navigate(createPageUrl('Islam'), { replace: true });
    }
  }, [navigate]);
  return null;
}
