/**
 * MosqueCommunityChat
 * Private, secure community hub for mosques & Islamic organisations.
 * Enterprise Islamic plan only.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Shield } from 'lucide-react';

import MosqueChannelSidebar, { DEFAULT_CHANNELS } from './mosque/MosqueChannelSidebar';
import MosqueChatPanel from './mosque/MosqueChatPanel';
import HajjCoordinationPanel from './mosque/HajjCoordinationPanel';
import StudyCirclePanel from './mosque/StudyCirclePanel';

export default function MosqueCommunityChat() {
  const [selectedChannel, setSelectedChannel] = useState(DEFAULT_CHANNELS[1]); // default: general
  const [customChannels, setCustomChannels] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const handleNewCustomChannel = (channel) => {
    setCustomChannels(prev => [...prev, channel]);
    setSelectedChannel(channel);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-amber-200 dark:border-amber-800/40 overflow-hidden shadow-xl shadow-amber-100/30 dark:shadow-amber-900/10 bg-white dark:bg-slate-900">
      {/* Security banner */}
      <div className="flex items-center justify-center gap-2 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-semibold">
        <Shield className="w-3 h-3" />
        End-to-end encrypted · Private organisation channel · Enterprise Islamic
        <Lock className="w-3 h-3" />
      </div>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <MosqueChannelSidebar
          selectedChannel={selectedChannel}
          onSelect={setSelectedChannel}
          user={user}
          customChannels={customChannels}
          onChannelsChange={handleNewCustomChannel}
        />

        {/* Right panel: optional context card + chat */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Context panels for special channels */}
          {selectedChannel?.type === 'hajj' && <HajjCoordinationPanel />}
          {selectedChannel?.type === 'study' && <StudyCirclePanel />}

          <MosqueChatPanel
            key={selectedChannel?.id}
            channel={selectedChannel}
            user={user}
          />
        </div>
      </div>
    </div>
  );
}