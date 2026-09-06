import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/** Legacy route — consolidated into Islam → Zakat hub. */
export default function ZakatDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`${createPageUrl('Islam')}?section=zakat`, { replace: true });
  }, [navigate]);
  return null;
}
