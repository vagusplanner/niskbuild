import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';

export default function NotificationSettings() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/Account" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Notification Settings</h1>
          <p className="text-xs text-white/60">Control how and when Vagus contacts you</p>
        </div>
      </div>
      <NotificationPreferencesPanel />
    </div>
  );
}