// Monthly Recap redirects to Wellness (Journal tab)
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MonthlyRecapPage() {
  return <Navigate to={`${createPageUrl('Wellness')}?section=journal`} replace />;
}
