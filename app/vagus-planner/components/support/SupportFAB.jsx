import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { FloatingButton, useFloatingManager } from '@/components/ui/floating-manager';

const AISupportChat = lazy(() => import('./AISupportChat'));
const ProactiveSupportMonitor = lazy(() => import('./ProactiveSupportMonitor'));

export default function SupportFAB() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { openFloating, closeFloating } = useFloatingManager();

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener('open_support_chat', handleOpenChat);
    return () => window.removeEventListener('open_support_chat', handleOpenChat);
  }, []);

  const handleToggle = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      openFloating('support');
    } else {
      closeFloating();
    }
  };

  return (
    <>
      <FloatingButton id="support" position="bottom-right" stackOrder={2}>
        <Button
          onClick={handleToggle}
          data-tour="support-chat"
          className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </FloatingButton>

      <Suspense fallback={null}>
        <AISupportChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        <ProactiveSupportMonitor />
      </Suspense>
    </>
  );
}