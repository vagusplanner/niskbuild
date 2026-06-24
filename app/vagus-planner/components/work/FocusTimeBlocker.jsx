import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Focus, Clock, Zap, BellOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const FOCUS_BLOCKS = [
  { duration: 25, label: 'Pomodoro', icon: '🍅' },
  { duration: 50, label: 'Deep Work', icon: '🎯' },
  { duration: 90, label: 'Flow State', icon: '🌊' },
  { duration: 120, label: 'Power Session', icon: '⚡' }
];

export default function FocusTimeBlocker() {
  const [activeFocus, setActiveFocus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const queryClient = useQueryClient();

  const startFocusBlock = async (block) => {
    try {
      // Create a focus event
      const now = new Date();
      const endTime = new Date(now.getTime() + block.duration * 60000);

      await base44.entities.Event.create({
        title: `🎯 ${block.label} Focus Block`,
        category: 'work',
        start_date: now.toISOString(),
        end_date: endTime.toISOString(),
        notes: 'Deep work session - notifications muted',
        color: '#7c3aed'
      });

      setActiveFocus(block);
      setTimeLeft(block.duration * 60);

      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            endFocusBlock();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Focus mode activated for ${block.duration} minutes`);

      // Request notification permission and schedule end notification
      if ('Notification' in window && Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification('Focus Block Complete! 🎉', {
            body: 'Time to take a break and recharge.',
            icon: '/icon-192.png'
          });
        }, block.duration * 60000);
      }
    } catch (error) {
      toast.error('Failed to start focus block');
    }
  };

  const endFocusBlock = () => {
    setActiveFocus(null);
    setTimeLeft(null);
    toast.success('Focus block completed! Take a break 🎉');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Focus className="w-5 h-5 text-purple-600" />
          Focus Time Blocker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeFocus ? (
          <div className="grid grid-cols-2 gap-3">
            {FOCUS_BLOCKS.map((block, idx) => (
              <button
                key={idx}
                onClick={() => startFocusBlock(block)}
                className="p-4 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all text-center"
              >
                <div className="text-3xl mb-2">{block.icon}</div>
                <p className="font-semibold text-slate-800">{block.label}</p>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-slate-600">
                  <Clock className="w-3 h-3" />
                  <span>{block.duration} min</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center space-y-4 py-6">
            <div className="text-6xl mb-4">{activeFocus.icon}</div>
            <h3 className="text-2xl font-bold text-purple-900">{activeFocus.label}</h3>
            <div className="text-5xl font-bold text-purple-600 tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <BellOff className="w-4 h-4" />
              <span>Notifications muted</span>
            </div>
            <Button
              onClick={endFocusBlock}
              variant="outline"
              className="mt-4"
            >
              End Focus Session
            </Button>
          </div>
        )}

        <div className="p-3 bg-white rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <p className="text-sm font-semibold text-slate-800">Focus Tips</p>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• Close unnecessary tabs and apps</li>
            <li>• Put phone on Do Not Disturb</li>
            <li>• Take breaks between sessions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}