// Settings page redirects to the Account/Profile page (Settings tab)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SettingsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('Profile') + '?tab=settings', { replace: true });
  }, []);
  return null;
}