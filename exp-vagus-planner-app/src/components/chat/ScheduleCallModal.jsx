import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Video, Calendar, Clock } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addHours } from 'date-fns';

export default function ScheduleCallModal({ open, onOpenChange, chat, currentUser, onScheduled }) {
  const now = new Date();
  const defaultStart = format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm");
  const [title, setTitle] = useState(`Call with ${chat?.name || ''}`);
  const [startDate, setStartDate] = useState(defaultStart);
  const [duration, setDuration] = useState(30);
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const qc = useQueryClient();

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + duration * 60000);

      // Create calendar event
      const event = await SDK.entities.Event.create({
        title: title.trim(),
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        category: 'personal',
        description: `Scheduled ${callType} call via Vagus Planner Chat`,
        location: `Vagus Call · ${chat?.name}`,
      });

      // Send a message in the chat with event metadata
      const msgData = {
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email.split('@')[0],
        message: `📅 Scheduled a ${callType} call: **${title}** on ${format(start, 'EEE d MMM @ HH:mm')}`,
        message_type: 'text',
        metadata: {
          event: {
            id: event.id,
            title: event.title,
            start_date: start.toISOString(),
            end_date: end.toISOString(),
            call_type: callType,
          },
          rsvps: {}
        }
      };

      if (chat.type === 'group') {
        await SDK.entities.GroupMessage.create({ ...msgData, group_chat_id: chat.id });
      } else {
        await SDK.entities.Chat.create({ ...msgData, conversation_id: chat.id, is_read: false });
      }

      return event;
    },
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['chat-messages'] });
      qc.invalidateQueries({ queryKey: ['groupMessages'] });
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('📅 Call scheduled and added to your calendar!');
      onScheduled?.(event);
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Schedule a Call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Call type */}
          <div className="flex gap-2">
            {['video', 'audio'].map(type => (
              <button
                key={type}
                onClick={() => setCallType(type)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  callType === type
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-teal-400'
                }`}
              >
                {type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div>
            <Label>Call Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Duration</Label>
            <div className="flex gap-2 mt-1">
              {[15, 30, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    duration === d
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-teal-400'
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending || !title.trim() || !startDate}
            >
              {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}