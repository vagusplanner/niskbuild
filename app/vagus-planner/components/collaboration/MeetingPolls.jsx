import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Plus, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function MeetingPolls() {
  const [polls, setPolls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const handleCreatePoll = async () => {
    if (!title || !attendees) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Generate time options from free slots
      const options = generateTimeOptions();

      const newPoll = {
        id: Date.now(),
        title,
        attendees: attendees.split(',').map(e => e.trim()),
        options,
        votes: options.map(opt => ({ time: opt, count: 0 })),
        status: 'active',
        createdAt: new Date()
      };

      setPolls([...polls, newPoll]);
      setTitle('');
      setAttendees('');
      setShowForm(false);
      toast.success('Poll created and sent to attendees');
    } catch (err) {
      toast.error('Failed to create poll');
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    const now = new Date();

    for (let day = 1; day <= 7; day++) {
      for (let hour = 9; hour < 17; hour += 2) {
        const slotStart = new Date(now);
        slotStart.setDate(slotStart.getDate() + day);
        slotStart.setHours(hour, 0, 0, 0);

        const isFree = !events.some(e => {
          const eventStart = new Date(e.start_date);
          const eventEnd = new Date(e.end_date);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(slotEnd.getHours() + 1);
          return !(slotEnd <= eventStart || slotStart >= eventEnd);
        });

        if (isFree) {
          options.push(slotStart);
        }

        if (options.length >= 4) break;
      }
      if (options.length >= 4) break;
    }

    return options;
  };

  const handleVote = (pollId, optionIndex) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId) {
        const newVotes = [...poll.votes];
        newVotes[optionIndex].count += 1;
        return { ...poll, votes: newVotes };
      }
      return poll;
    }));
    toast.success('Vote recorded');
  };

  const handleAutoSchedule = async (poll) => {
    // Find the option with most votes
    const winner = poll.votes.reduce((max, opt) => 
      opt.count > max.count ? opt : max
    );

    try {
      await base44.entities.Event.create({
        title: poll.title,
        start_date: winner.time.toISOString(),
        end_date: new Date(winner.time.getTime() + 60 * 60 * 1000).toISOString(),
        category: 'meeting'
      });

      setPolls(polls.filter(p => p.id !== poll.id));
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Meeting scheduled automatically');
    } catch (err) {
      toast.error('Failed to schedule meeting');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Meeting Polls
          </CardTitle>
          <CardDescription>"When are you free?" polls that auto-schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="poll-title" className="text-sm">Meeting Title</Label>
                  <Input
                    id="poll-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                    placeholder="Team sync, 1:1, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="poll-attendees" className="text-sm">Attendees (comma-separated emails)</Label>
                  <textarea
                    id="poll-attendees"
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                    rows="3"
                    placeholder="john@example.com, jane@example.com"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreatePoll} className="flex-1" size="sm">Create & Send Poll</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Create Poll
              </Button>
            )}
          </AnimatePresence>

          {polls.length > 0 && (
            <div className="space-y-3">
              {polls.map(poll => (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="mb-2">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{poll.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      📧 {poll.attendees.length} attendee{poll.attendees.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="space-y-1 mb-3">
                    {poll.options.map((opt, idx) => {
                      const voteCount = poll.votes[idx]?.count || 0;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleVote(poll.id, idx)}
                          className="w-full text-left p-2 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium">{opt.toLocaleDateString()} {opt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-slate-600 dark:text-slate-400">{voteCount} votes</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => handleAutoSchedule(poll)}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Auto-Schedule (Most Votes)
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}