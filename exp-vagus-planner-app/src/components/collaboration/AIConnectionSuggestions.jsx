import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Users, Loader2, UserPlus, X } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIConnectionSuggestions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => SDK.auth.me()
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const { data: existingConnections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => SDK.entities.SocialConnection.list(),
    enabled: !!user
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.list()
  });

  const addConnectionMutation = useMutation({
    mutationFn: (friendEmail) => SDK.entities.SocialConnection.create({
      friend_email: friendEmail,
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection request sent!');
    }
  });

  const generateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const userSettings = settings[0] || {};
      const focusAreas = userSettings.focus_areas || [];
      const interests = userSettings.ai_interest_areas || [];
      
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `Based on the following user profile, suggest 3-5 professionals they should connect with.
        
User Profile:
- Focus Areas: ${focusAreas.join(', ') || 'work, personal development'}
- Interests: ${interests.join(', ') || 'productivity, technology'}
- Current Goals: ${goals.map(g => g.title).join(', ') || 'career growth'}
- Work Style: ${userSettings.work_style || 'flexible'}

For each suggestion, provide:
- name: A realistic professional name
- title: Their professional title
- matchReason: Why they'd be a good connection (be specific)
- sharedInterests: Array of 2-3 shared interests
- potentialValue: What collaboration opportunities exist
- email: Generate a realistic professional email

Return ONLY valid JSON array.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  title: { type: 'string' },
                  matchReason: { type: 'string' },
                  sharedInterests: { type: 'array', items: { type: 'string' } },
                  potentialValue: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
      toast.success('AI found great connections for you!');
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const dismissSuggestion = (index) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Connection Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-purple-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-4">
              Let AI find professionals you should connect with based on your goals and interests
            </p>
            <Button
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Connections
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {suggestion.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{suggestion.name}</h4>
                        <p className="text-xs text-slate-500">{suggestion.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => dismissSuggestion(index)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-3">{suggestion.matchReason}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {suggestion.sharedInterests.map((interest, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="bg-purple-50 p-2 rounded text-xs text-purple-900 mb-3">
                    <strong>Potential:</strong> {suggestion.potentialValue}
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => addConnectionMutation.mutate(suggestion.email)}
                    disabled={addConnectionMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <Button
              variant="outline"
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding More...
                </>
              ) : (
                'Refresh Suggestions'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}