// Settings page redirects to Account → Preferences
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/Account#preferences', { replace: true });
  }, [navigate]);
  return null;
}
