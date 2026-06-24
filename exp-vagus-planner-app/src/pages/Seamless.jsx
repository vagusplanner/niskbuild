import React from 'react';
import { motion } from 'framer-motion';
import VoiceScheduler from '@/components/seamless/VoiceScheduler';
import SmartWatchDashboard from '@/components/seamless/SmartWatchDashboard';
import OfflineChat from '@/components/seamless/OfflineChat';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

const sections = [
  {
    title: 'Voice & Hands-Free',
    description: 'Control your calendar with natural voice commands',
    features: [VoiceScheduler]
  },
  {
    title: 'Wearable Integration',
    description: 'Quick access on smartwatch and wearable devices',
    features: [SmartWatchDashboard]
  },
  {
    title: 'Offline & Sync',
    description: 'Full functionality without internet connection',
    features: [OfflineChat]
  }
];

export default function Seamless() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Seamless Experience</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Voice control, wearables, offline support, and WhatsApp integration
        </p>
      </motion.div>

      {sections.map((section, sectionIdx) => (
        <div key={section.title} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{section.description}</p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {section.features.map((Component, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (sectionIdx * 0.2) + (idx * 0.1) }}
              >
                <Component />
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* WhatsApp Bot Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="bg-gradient-to-br from-green-50 dark:from-green-950 to-lime-50 dark:to-lime-950 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              WhatsApp Calendar Bot
            </CardTitle>
            <CardDescription>Manage your calendar directly from WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-700">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                💬 Available on WhatsApp
              </p>
              <div 
                onClick={() => {
                  const url = SDK.agents.getWhatsAppConnectURL('whatsapp_calendar');
                  window.open(url, '_blank');
                }}
                className="flex items-center justify-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors font-medium"
              >
                <MessageCircle className="w-5 h-5" />
                Open WhatsApp Bot
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">What you can do:</p>
              <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
                <li>✓ Check your schedule: "What's my day looking like?"</li>
                <li>✓ Create events: "Schedule meeting with team next Tuesday 2pm"</li>
                <li>✓ Find free slots: "When am I free this week?"</li>
                <li>✓ Reschedule: "Move my 3pm meeting to 4pm"</li>
                <li>✓ Get details: "Tell me about my next meeting"</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Card */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 bg-gradient-to-r from-indigo-50 dark:from-indigo-950 to-purple-50 dark:to-purple-950 rounded-xl border border-indigo-200 dark:border-indigo-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">🚀 Seamless Features</h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>✓ Voice-First Interface - Schedule with natural language</li>
          <li>✓ WhatsApp Bot - Manage calendar via WhatsApp messages</li>
          <li>✓ Smart Watch Integration - Quick actions and reminders on wrist</li>
          <li>✓ Offline-First - Full functionality without internet</li>
          <li>🔜 Smart Glasses Support - Hands-free calendar management on AR glasses</li>
          <li>🔜 SMS Integration - Control calendar via text messages</li>
        </ul>
      </motion.div>
    </div>
  );
}