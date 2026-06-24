import React, { useState } from 'react';
import IntelligentSchedulingEngine from '@/components/calendar/IntelligentSchedulingEngine';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  Users,
  Clock,
  MapPin,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SmartMeetingScheduler({ onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState([]);
  const [participantInput, setParticipantInput] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [optimalSlots, setOptimalSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.SocialConnection.list()
  });

  const findSlotsMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('findOptimalMeetingTimes', {
        participants,
        duration,
        dateRange: 7
      });
      return data;
    },
    onSuccess: (data) => {
      setOptimalSlots(data.optimal_slots || []);
      toast.success('Found optimal meeting times!');
    },
    onError: () => {
      toast.error('Failed to find meeting times');
    }
  });

  const checkConflictsMutation = useMutation({
    mutationFn: async (timeSlot) => {
      const { data } = await base44.functions.invoke('detectMeetingConflicts', {
        proposedTime: timeSlot.start,
        participants,
        duration
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.hasConflicts) {
        setConflictInfo(data);
        toast.warning('Conflicts detected! See alternatives.');
      } else {
        toast.success('No conflicts - time works for everyone!');
        setConflictInfo(null);
      }
    }
  });

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) return;
      
      const { data } = await base44.functions.invoke('sendMeetingInvites', {
        title,
        description,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        attendees: participants,
        location
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success('Meeting scheduled & invites sent!', {
        description: `${data.invites_sent} attendees notified via email`
      });
      onClose?.();
    },
    onError: () => {
      toast.error('Failed to send invites');
    }
  });

  const addParticipant = () => {
    if (participantInput && participantInput.includes('@')) {
      setParticipants(prev => [...prev, participantInput]);
      setParticipantInput('');
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    checkConflictsMutation.mutate(slot);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Smart Meeting Scheduler
          </CardTitle>
          <CardDescription>
            AI-powered scheduling with automatic conflict detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Team Sync"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Discuss project updates..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="flex gap-2">
              <Input
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                placeholder="Add email address"
              />
              <Button onClick={addParticipant} variant="outline">
                <Users className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {participants.map((email, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {email}
                  <button
                    onClick={() => setParticipants(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office or Google Meet"
              />
            </div>
          </div>

          <Button
            onClick={() => findSlotsMutation.mutate()}
            disabled={!title || participants.length === 0 || findSlotsMutation.isPending}
            className="w-full"
          >
            {findSlotsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Calendars...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Find Optimal Times
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Optimal Time Slots */}
      <AnimatePresence>
        {optimalSlots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Recommended Time Slots
            </h3>
            {optimalSlots.map((slot, idx) => (
              <Card
                key={idx}
                className={`cursor-pointer transition-all ${
                  selectedSlot?.start === slot.start
                    ? 'ring-2 ring-emerald-600 bg-emerald-50'
                    : 'hover:shadow-md'
                }`}
                onClick={() => handleSelectSlot(slot)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-lg">
                        {format(new Date(slot.start), 'EEEE, MMM d')}
                      </p>
                      <p className="text-sm text-slate-600">
                        {format(new Date(slot.start), 'h:mm a')} - {format(new Date(slot.end), 'h:mm a')}
                      </p>
                    </div>
                    <Badge variant={slot.score > 8 ? 'default' : 'secondary'}>
                      Score: {slot.score}/10
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{slot.reasoning}</p>
                  
                  {/* Timezone details for participants */}
                  {slot.timezone_details && slot.timezone_details.length > 0 && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-700 mb-1">Attendee Local Times:</p>
                      <div className="space-y-1">
                        {slot.timezone_details.map((tz, tzIdx) => (
                          <div key={tzIdx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600">{tz.participant}</span>
                            <span className={tz.is_working_hours ? 'text-green-600' : 'text-amber-600'}>
                              {tz.local_time} {tz.is_working_hours ? '✓' : '⚠️'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {slot.conflicts?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      Minor conflicts detected
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Information */}
      <AnimatePresence>
        {conflictInfo?.hasConflicts && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5" />
                  Conflicts Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">Conflicting participants:</p>
                  {conflictInfo.conflicts.map((c, idx) => (
                    <Badge key={idx} variant="destructive" className="mr-2">
                      {c.email}
                    </Badge>
                  ))}
                </div>
                
                {conflictInfo.alternatives?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Alternative times:</p>
                    {conflictInfo.alternatives.map((alt, idx) => (
                      <Card key={idx} className="mb-2 cursor-pointer hover:bg-white" onClick={() => handleSelectSlot(alt)}>
                        <CardContent className="pt-3 pb-3">
                          <p className="font-medium text-sm">
                            {format(new Date(alt.start), 'EEEE, MMM d @ h:mm a')}
                          </p>
                          <p className="text-xs text-slate-600">{alt.reasoning}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Invite Button */}
      {selectedSlot && !conflictInfo?.hasConflicts && (
        <Button
          onClick={() => sendInviteMutation.mutate()}
          disabled={sendInviteMutation.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          size="lg"
        >
          {sendInviteMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Invites...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Calendar Invites
            </>
          )}
        </Button>
      )}
    </div>
  );
}