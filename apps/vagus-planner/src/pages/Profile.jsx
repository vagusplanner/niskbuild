/**
 * Legacy /Profile — redirects to consolidated Account ownership tabs.
 * Old ?tab= / bare-hash values map to Account ?section= (HashRouter-safe).
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_TO_SECTION = {
  settings: 'preferences',
  preferences: 'preferences',
  billing: 'billing',
  security: 'security',
  privacy: 'privacy',
  delete: 'privacy',
  danger: 'privacy',
  profile: 'personal',
  personal: 'personal',
  insights: 'personal',
  widgets: 'preferences',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = (params.get('tab') || '').toLowerCase();
    const fromQuery = TAB_TO_SECTION[tab];
    // Bare legacy hash only (not HashRouter paths like #/Account)
    const rawHash = (location.hash || '').replace(/^#/, '').toLowerCase();
    const bareHash =
      rawHash && !rawHash.startsWith('/') ? rawHash.split('?')[0] : '';
    const fromHash = TAB_TO_SECTION[bareHash];
    const section = fromQuery || fromHash || null;
    const target = section ? `/Account?section=${section}` : '/Account';
    navigate(target, { replace: true });
  }, [navigate, location.search, location.hash]);

  return null;
}
