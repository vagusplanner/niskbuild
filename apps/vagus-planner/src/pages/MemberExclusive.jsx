// Member Perks redirects to Account → Subscription & Billing
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MemberExclusivePage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/Account#billing', { replace: true });
  }, [navigate]);
  return null;
}
