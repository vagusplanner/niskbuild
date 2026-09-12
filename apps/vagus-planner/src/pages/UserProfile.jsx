// UserProfile redirects to Account → Personal Info
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserProfilePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/Account#personal', { replace: true });
  }, [navigate]);
  return null;
}
