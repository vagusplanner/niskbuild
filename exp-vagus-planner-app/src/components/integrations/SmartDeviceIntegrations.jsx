import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Watch, Mic, Bell, Volume2, VolumeX } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function SmartDeviceIntegrations() {
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResponse, setVoiceResponse] = useState(null);

  const testVoiceMutation = useMutation({
    mutationFn: async () => {
      const user = await SDK.auth.me();
      const response = await SDK.functions.invoke('processVoiceQuery', {
        query: voiceQuery,
        user_email: user.email
      });
      return response.data;
    },
    onSuccess: (data) => {
      setVoiceResponse(data);
      toast.success('Voice query processed!');
    }
  });

  const testWearableMutation = useMutation({
    mutationFn: async () => {
      const user = await SDK.auth.me();
      const response = await SDK.functions.invoke('sendContextualWearableNotification', {
        user_email: user.email,
        notification_type: 'context_aware'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.notification_sent) {
        toast.success(`Notification sent: ${data.notification?.title}`);
      } else {
        toast.info(data.reason);
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* Voice Assistant Integration */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600" />
            Voice Assistant (Alexa, Google Home)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-xl border-2 border-blue-200">
            <h4 className="font-semibold text-slate-800 mb-2">How to Connect:</h4>
            <ol className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Open Alexa/Google Home app</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Search for "MyAssistant Calendar" skill</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Link your account using your email</span>
              </li>
            </ol>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white">
            <h4 className="font-semibold mb-2">Voice Commands:</h4>
            <div className="space-y-1 text-sm">
              <p>• "What's my next event?"</p>
              <p>• "When is the next prayer?"</p>
              <p>• "Show my schedule for today"</p>
              <p>• "When are today's prayer times?"</p>
              <p>• "When am I free?"</p>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Test a voice command..."
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
            />
            <Button
              onClick={() => testVoiceMutation.mutate()}
              disabled={!voiceQuery || testVoiceMutation.isPending}
              className="w-full bg-blue-600"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Test Voice Query
            </Button>
          </div>

          {voiceResponse && (
            <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
              <p className="text-sm font-semibold text-green-900 mb-1">Response:</p>
              <p className="text-sm text-green-800">{voiceResponse.voice_response}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wearable Integration */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Watch className="w-6 h-6 text-purple-600" />
            Wearables (Apple Watch, Fitbit)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white rounded-xl border-2 border-purple-200 text-center">
              <Bell className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800">Smart Notifications</p>
              <p className="text-xs text-slate-600 mt-1">Context-aware alerts</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-purple-200 text-center">
              <VolumeX className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-slate-800">Prayer Silent Mode</p>
              <p className="text-xs text-slate-600 mt-1">Auto-silence during prayer</p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border-2 border-purple-200">
            <h4 className="font-semibold text-slate-800 mb-2">Smart Notification Examples:</h4>
            <div className="space-y-2">
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-semibold text-purple-900">Prayer + Task Alert</p>
                <p className="text-xs text-purple-700">"Zuhr in 30 mins. You have 2 urgent tasks. Finish now?"</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">Meeting Reminder</p>
                <p className="text-xs text-blue-700">"Team meeting in 15 mins. Location: Office Building"</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-semibold text-green-900">Auto Silent</p>
                <p className="text-xs text-green-700">"Prayer time - All notifications silenced for 20 mins"</p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => testWearableMutation.mutate()}
            disabled={testWearableMutation.isPending}
            className="w-full bg-purple-600"
          >
            <Bell className="w-4 h-4 mr-2" />
            Test Smart Notification
          </Button>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2">🔐 Privacy First</h4>
            <p className="text-xs text-amber-800">
              All notifications are processed on your device. No prayer data is shared with third parties. 
              Wearable sync respects your prayer times automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900 text-sm mb-1">For Alexa:</p>
            <p className="text-xs text-blue-800">Say "Alexa, enable MyAssistant Calendar skill"</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="font-semibold text-green-900 text-sm mb-1">For Google Home:</p>
            <p className="text-xs text-green-800">Say "Hey Google, talk to MyAssistant Calendar"</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="font-semibold text-purple-900 text-sm mb-1">For Apple Watch:</p>
            <p className="text-xs text-purple-800">Install MyAssistant app from Watch App Store</p>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg">
            <p className="font-semibold text-pink-900 text-sm mb-1">For Fitbit:</p>
            <p className="text-xs text-pink-800">Connect via Fitbit Gallery → MyAssistant</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}