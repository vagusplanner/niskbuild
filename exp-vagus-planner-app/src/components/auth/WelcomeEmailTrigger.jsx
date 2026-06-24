/**
 * Invisible component — triggers welcome email once per user.
 * Mount this inside the main authenticated layout.
 */
import { useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

const SENT_KEY = 'vagus_welcome_sent';

export default function WelcomeEmailTrigger() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me(),
  });

  useEffect(() => {
    if (!user?.email) return;
    const sentKey = `${SENT_KEY}_${user.email}`;
    if (localStorage.getItem(sentKey)) return;

    // Fire and forget — don't block UI
    SDK.functions.invoke('onNewUserWelcome', {
      email: user.email,
      full_name: user.full_name,
    }).then(() => {
      localStorage.setItem(sentKey, '1');
    }).catch(() => {
      // Silent fail — not critical
    });
  }, [user?.email]);

  return null;
}