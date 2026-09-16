import { Navigate } from 'react-router-dom';

/**
 * Deprecated: old Core.SendEmail support form.
 * Canonical public support page is /support (same content as /Contact).
 */
export default function SupportPage() {
  return <Navigate to="/support" replace />;
}
