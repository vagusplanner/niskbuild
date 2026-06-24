import React from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistantSettings() {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      if (userSettings.id) {
        return await SDK.entities.UserSettings.update(userSettings.id, updates);
      } else {
        return await SDK.entities.UserSettings.create(updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('AI settings updated');
    }
  });

  const handleUpdate = (key, value) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-600" />
            AI Assistant Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Response Tone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              Response Tone
            </Label>
            <Select
              value={userSettings.ai_response_tone || 'friendly'}
              onValueChange={(value) => handleUpdate('ai_response_tone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Professional</span>
                    <span className="text-xs text-slate-500">Formal and business-like</span>
                  </div>
                </SelectItem>
                <SelectItem value="friendly">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Friendly</span>
                    <span className="text-xs text-slate-500">Warm and approachable</span>
                  </div>
                </SelectItem>
                <SelectItem value="casual">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Casual</span>
                    <span className="text-xs text-slate-500">Relaxed and conversational</span>
                  </div>
                </SelectItem>
                <SelectItem value="formal">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Formal</span>
                    <span className="text-xs text-slate-500">Very professional and structured</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Choose how the AI assistant communicates with you
            </p>
          </div>

          {/* Response Length */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-500" />
              Response Length
            </Label>
            <Select
              value={userSettings.ai_response_length || 'medium'}
              onValueChange={(value) => handleUpdate('ai_response_length', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Brief</span>
                    <span className="text-xs text-slate-500">Short and concise answers</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Medium</span>
                    <span className="text-xs text-slate-500">Balanced detail level</span>
                  </div>
                </SelectItem>
                <SelectItem value="detailed">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Detailed</span>
                    <span className="text-xs text-slate-500">Comprehensive explanations</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Control how much detail you get in responses
            </p>
          </div>

          {/* Proactive Suggestions */}
          <div className="flex items-center justify-between p-4 bg-teal-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <Label className="text-base font-medium text-slate-800">
                  Proactive Suggestions
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  Get AI-powered insights based on your calendar events and activities
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Includes prayer time reminders, travel suggestions, and meeting prep
                </p>
              </div>
            </div>
            <Switch
              checked={userSettings.ai_proactive_suggestions ?? true}
              onCheckedChange={(checked) => handleUpdate('ai_proactive_suggestions', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Example Preview */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-sm font-medium text-slate-700 mb-1">Your settings:</p>
              <p className="text-sm text-slate-600">
                {userSettings.ai_response_tone === 'professional' && 'I will provide professional, business-focused responses.'}
                {userSettings.ai_response_tone === 'friendly' && 'I\'ll be warm and friendly in my responses!'}
                {userSettings.ai_response_tone === 'casual' && 'Hey! I\'ll keep things casual and easy-going.'}
                {userSettings.ai_response_tone === 'formal' && 'I shall maintain a formal and structured communication style.'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Response length: {userSettings.ai_response_length || 'medium'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}