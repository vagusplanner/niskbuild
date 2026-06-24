// Subscription Management redirects to Profile (Billing tab)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SubscriptionManagementPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('Profile') + '?tab=billing', { replace: true });
  }, []);
  return null;
}