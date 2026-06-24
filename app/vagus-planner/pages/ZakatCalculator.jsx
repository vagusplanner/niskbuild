import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ZakatCalculatorPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/ZakatDonation', { replace: true }); }, []);
  return null;
}