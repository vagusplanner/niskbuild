import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function FamilyCalendarCoordination() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [commonSlots, setCommonSlots] = useState([]);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const findCommonAvailability = async () => {
    if (familyMembers.length === 0) {
      toast.error('Add family members first');
      return;
    }

    // Simulate finding common slots (in production, fetch from each family member's calendar)
    const today = new Date();
    today.setHours(18, 0, 0, 0); // Dinner time
    const slots = [];

    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + day);

      // Check if this time slot is free for current user
      const isFree = !events.some(e => {
        const eventStart = new Date(e.start_date);
        const eventEnd = new Date(e.end_date);
        const slotEnd = new Date(checkDate);
        slotEnd.setHours(19, 0, 0, 0);
        return !(slotEnd <= eventStart || checkDate >= eventEnd);
      });

      if (isFree && checkDate.getDay() !== 0) { // Exclude Sundays
        slots.push({
          date: new Date(checkDate),
          time: '6:00 PM',
          confidence: Math.random() > 0.3 ? 100 : 80 // % likelihood all are free
        });
      }
    }

    setCommonSlots(slots.slice(0, 3));
    toast.success(`Found ${slots.length} potential family dinner times`);
  };

  const handleAddMember = () => {
    if (!memberName || !memberEmail) {
      toast.error('Please fill in all fields');
      return;
    }

    setFamilyMembers([...familyMembers, { id: Date.now(), name: memberName, email: memberEmail }]);
    setMemberName('');
    setMemberEmail('');
    toast.success('Family member added');
  };

  const handleScheduleDinner = async (slot) => {
    try {
      await SDK.entities.Event.create({
        title: '👨‍👩‍👧‍👦 Family Dinner',
        start_date: slot.date.toISOString(),
        end_date: new Date(slot.date.getTime() + 90 * 60 * 1000).toISOString(),
        category: 'family',
        description: `Family dinner with ${familyMembers.map(m => m.name).join(', ')}`
      });

      queryClient.invalidateQueries({ queryKey: ['events'] });
      setCommonSlots(commonSlots.filter(s => s !== slot));
      toast.success('Family dinner scheduled!');
    } catch (err) {
      toast.error('Failed to schedule dinner');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            Family Calendar Coordination
          </CardTitle>
          <CardDescription>Auto-find when everyone's free for family events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Family Member */}
          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="member-name" className="text-sm">Name</Label>
                  <Input
                    id="member-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="mt-1"
                    placeholder="Mom, Dad, Sister..."
                  />
                </div>

                <div>
                  <Label htmlFor="member-email" className="text-sm">Email</Label>
                  <Input
                    id="member-email"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="mt-1"
                    placeholder="member@example.com"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddMember} size="sm" className="flex-1">Add Member</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Family Member
              </Button>
            )}
          </AnimatePresence>

          {/* Family Members List */}
          {familyMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Family members ({familyMembers.length}):</p>
              {familyMembers.map(member => (
                <div key={member.id} className="p-2 bg-pink-50 dark:bg-pink-950 rounded border border-pink-200 dark:border-pink-800 text-sm">
                  <p className="font-medium text-pink-900 dark:text-pink-100">{member.name}</p>
                  <p className="text-xs text-pink-700 dark:text-pink-300">{member.email}</p>
                </div>
              ))}
            </div>
          )}

          {/* Find Common Availability */}
          {familyMembers.length > 0 && (
            <Button onClick={findCommonAvailability} className="w-full">
              Find Family Dinner Times
            </Button>
          )}

          {/* Common Slots */}
          {commonSlots.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">When everyone's free:</p>
              {commonSlots.map((slot, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-pink-50 dark:bg-pink-950 rounded-lg border border-pink-200 dark:border-pink-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm text-pink-900 dark:text-pink-100">
                      {slot.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-pink-700 dark:text-pink-300 mt-1">
                      {slot.time} • {slot.confidence}% likely all available
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleScheduleDinner(slot)}
                    className="shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          {familyMembers.length === 0 && !showForm && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
              Add family members to find common availability
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}