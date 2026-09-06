// Journal page redirects to Wellness (Journal tab)
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function JournalPage() {
  return <Navigate to={`${createPageUrl('Wellness')}?section=journal`} replace />;
}
