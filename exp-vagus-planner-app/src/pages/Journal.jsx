// Journal page redirects to Wellness (Journal tab)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function JournalPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('Wellness') + '?section=journal', { replace: true });
  }, []);
  return null;
}