import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, UserPlus, Calendar, MessageCircle, 
  Sparkles, Loader2, Clock, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SocialScheduler() {
  const [command, setCommand] = useState('');
  const [processing, setProcessing] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);

  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['social-connections'],
    queryFn: () => SDK.entities.SocialConnection.filter({ status: 'active' })
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['social-suggestions'],
    queryFn: () => SDK.entities.SocialSuggestion.filter({ status: 'active' }, '-created_date', 10)
  });

  const processCommandMutation = useMutation({
    mutationFn: async (cmd) => {
      return SDK.functions.invoke('processSocialCommand', { command: cmd });
    },
    onSuccess: (response) => {
      if (response.data.success) {
        setProposal(response.data.proposal);
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
      setProcessing(false);
    },
    onError: () => {
      toast.error('Failed to process command');
      setProcessing(false);
    }
  });

  const analyzeAvailabilityMutation = useMutation({
    mutationFn: async (friendEmail) => {
      return SDK.functions.invoke('analyzeSocialAvailability', { 
        friend_email: friendEmail,
        duration_minutes: 60
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['social-suggestions'] });
      toast.success(`Found ${response.data.suggestions.length} optimal times!`);
    }
  });

  const generateStartersMutation = useMutation({
    mutationFn: async (friendEmail) => {
      return SDK.functions.invoke('generateConversationStarters', { 
        friend_email: friendEmail 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-suggestions'] });
      toast.success('Conversation starters generated!');
    }
  });

  const handleCommand = () => {
    if (!command.trim()) return;
    setProcessing(true);
    processCommandMutation.mutate(command);
  };

  const handleConfirmProposal = async () => {
    if (!proposal) return;

    await SDK.entities.Event.create({
      title: proposal.title,
      date: proposal.suggested_date,
      start_time: proposal.suggested_time,
      end_time: calculateEndTime(proposal.suggested_time, proposal.duration),
      category: 'social',
      location: proposal.location,
      description: `${proposal.activity || 'Social event'}\nWith: ${proposal.friends.join(', ')}\n\nScheduled by AI`,
      reminder_minutes: 60
    });

    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success('Event created!');
    setProposal(null);
    setCommand('');
  };

  const calculateEndTime = (startTime, duration) => {
    const [h, m] = startTime.split(':').map(Number);
    const end = new Date(2000, 0, 1, h, m + duration);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Natural Language Scheduler */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Social Scheduler
          </CardTitle>
          <p className="text-sm text-slate-600">
            Tell me who you want to meet and I'll find the best time
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder='Try: "Schedule coffee with Sarah this weekend" or "Dinner with close friends next Friday"'
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCommand()}
              className="flex-1"
            />
            <Button 
              onClick={handleCommand} 
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50" 
              onClick={() => setCommand('Lunch with John tomorrow')}>
              Lunch with John tomorrow
            </Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50"
              onClick={() => setCommand('Coffee this weekend')}>
              Coffee this weekend
            </Badge>
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-blue-50"
              onClick={() => setCommand('Dinner with close friends Friday evening')}>
              Dinner Friday evening
            </Badge>
          </div>

          <AnimatePresence>
            {proposal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white rounded-lg border-2 border-blue-300"
              >
                <h4 className="font-semibold text-slate-800 mb-3">📅 Proposal</h4>
                <div className="space-y-2 mb-4">
                  <p className="text-sm"><strong>Event:</strong> {proposal.title}</p>
                  <p className="text-sm"><strong>When:</strong> {format(new Date(proposal.suggested_date), 'EEE, MMM d')} at {proposal.suggested_time}</p>
                  <p className="text-sm"><strong>Duration:</strong> {proposal.duration} minutes</p>
                  {proposal.location && <p className="text-sm"><strong>Where:</strong> {proposal.location}</p>}
                </div>
                
                {proposal.ai_recommendations && proposal.ai_recommendations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-600 mb-2">AI also suggests:</p>
                    <div className="space-y-1">
                      {proposal.ai_recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="text-xs p-2 bg-blue-50 rounded">
                          {rec.date} at {rec.start_time} - {rec.suggested_activity} (Score: {rec.compatibility_score}/10)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleConfirmProposal} className="flex-1 bg-green-600 hover:bg-green-700">
                    Confirm & Create Event
                  </Button>
                  <Button variant="outline" onClick={() => setProposal(null)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Friends & Connections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Social Connections
            </CardTitle>
            <Button size="sm" variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length > 0 ? (
            <div className="space-y-2">
              {connections.map(connection => (
                <div key={connection.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{connection.friend_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {connection.relationship}
                      </Badge>
                      {connection.can_see_their_availability && (
                        <Badge className="text-xs bg-green-100 text-green-700">
                          Shared Calendar
                        </Badge>
                      )}
                    </div>
                    {connection.last_meetup && (
                      <p className="text-xs text-slate-500">
                        Last met: {format(new Date(connection.last_meetup), 'MMM d')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => analyzeAvailabilityMutation.mutate(connection.friend_email)}
                      disabled={!connection.can_see_their_availability}
                    >
                      <Calendar className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => generateStartersMutation.mutate(connection.friend_email)}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No connections yet</p>
              <p className="text-xs text-slate-400 mt-1">Add friends to enable AI scheduling</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map(suggestion => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{suggestion.description}</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">
                    {suggestion.suggestion_type.replace('_', ' ')}
                  </Badge>
                </div>

                {suggestion.suggested_times && suggestion.suggested_times.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-slate-700">Optimal times:</p>
                    {suggestion.suggested_times.slice(0, 3).map((time, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 bg-white rounded">
                        <span className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {time.date} at {time.start_time}
                        </span>
                        <span className="text-purple-600 font-medium">
                          Score: {time.compatibility_score}/10
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {suggestion.conversation_starters && suggestion.conversation_starters.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-medium text-slate-700">Conversation starters:</p>
                    {suggestion.conversation_starters.slice(0, 3).map((starter, i) => (
                      <div key={i} className="text-xs p-2 bg-white rounded">
                        💬 {starter}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}