/**
 * Legacy /Profile — redirects to consolidated Account ownership tabs.
 * Old ?tab= values map to Account hashes (personal / preferences / billing / privacy).
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_TO_HASH = {
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
    const hashFromQuery = TAB_TO_HASH[tab];
    const rawHash = (location.hash || '').replace(/^#/, '').toLowerCase();
    const hash = hashFromQuery || TAB_TO_HASH[rawHash] || (rawHash || null);
    const target = hash ? `/Account#${hash}` : '/Account';
    navigate(target, { replace: true });
  }, [navigate, location.search, location.hash]);

  return null;
}
