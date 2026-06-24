// UserProfile redirects to Profile page
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function UserProfilePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('Profile'), { replace: true });
  }, []);
  return null;
}