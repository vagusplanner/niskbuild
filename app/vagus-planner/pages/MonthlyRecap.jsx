// Monthly Recap redirects to Wellness (Journal tab)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MonthlyRecapPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Navigate to journal section — user can access recap feature there
    navigate(createPageUrl('Wellness') + '?section=journal', { replace: true });
  }, []);
  return null;
}