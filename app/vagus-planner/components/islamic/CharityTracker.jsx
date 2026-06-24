import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Plus, TrendingUp, DollarSign, Bell, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function CharityTracker() {
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [charityName, setCharityName] = useState('');
  const [type, setType] = useState('sadaqah');
  const [reminderFrequency, setReminderFrequency] = useState('weekly');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('monthly');
  const queryClient = useQueryClient();

  const { data: donations = [] } = useQuery({
    queryKey: ['charityDonations'],
    queryFn: () => base44.entities.CharityDonation.list()
  });

  const addDonationMutation = useMutation({
    mutationFn: (donation) => base44.entities.CharityDonation.create(donation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charityDonations'] });
      toast.success('Donation recorded! May Allah accept it 🤲');
      setShowForm(false);
      setAmount('');
      setCharityName('');
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: (goal) => base44.entities.Goal.create(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeGoals'] });
      toast.success('Charity goal created and linked! 🎯');
      setShowGoalForm(false);
      setGoalAmount('');
    }
  });

  const handleSetReminder = () => {
    const messages = {
      daily: 'Daily charity reminder set! 🤲',
      weekly: 'Weekly charity reminder set! 🤲',
      monthly: 'Monthly charity reminder set! 🤲',
    };
    // Store reminder preference in user settings
    base44.entities.UserSettings.list().then(settings => {
      const existing = settings[0];
      const reminderKey = `charity_reminder_${reminderFrequency}`;
      if (existing) {
        base44.entities.UserSettings.update(existing.id, { [reminderKey]: true });
      }
    });
    toast.success(messages[reminderFrequency] || 'Reminder set!');
  };

  const handleCreateGoal = () => {
    if (!goalAmount) return;
    createGoalMutation.mutate({
      title: `Give $${goalAmount} in charity (${goalPeriod})`,
      category: 'spiritual',
      description: `Charity/Sadaqah goal: donate $${goalAmount} this ${goalPeriod}`,
      priority: 'medium',
      status: 'in_progress',
      target_date: (() => {
        const d = new Date();
        if (goalPeriod === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (goalPeriod === 'yearly') d.setFullYear(d.getFullYear() + 1);
        else d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      })()
    });
  };

  const totalCharity = donations.reduce((acc, d) => acc + d.amount, 0);
  const thisMonth = donations.filter(d => {
    const donationDate = new Date(d.date);
    const now = new Date();
    return donationDate.getMonth() === now.getMonth() && donationDate.getFullYear() === now.getFullYear();
  }).reduce((acc, d) => acc + d.amount, 0);

  const byType = donations.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + d.amount;
    return acc;
  }, {});

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-green-600" />
            Charity Tracker
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white rounded-xl border-2 border-green-200 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <div className="text-2xl font-bold text-green-600">${totalCharity}</div>
            <p className="text-xs text-slate-600 mt-1">Total Given</p>
          </div>
          <div className="p-4 bg-white rounded-xl border-2 border-emerald-200 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
            <div className="text-2xl font-bold text-emerald-600">${thisMonth}</div>
            <p className="text-xs text-slate-600 mt-1">This Month</p>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="p-4 bg-white rounded-xl border-2 border-green-200 space-y-3">
            <Input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Charity name or cause"
              value={charityName}
              onChange={(e) => setCharityName(e.target.value)}
            />
            <div className="flex gap-2">
              {['sadaqah', 'zakat', 'general'].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    type === t ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button
              onClick={() => addDonationMutation.mutate({
                amount: parseFloat(amount),
                charity_name: charityName,
                type,
                date: new Date().toISOString().split('T')[0]
              })}
              disabled={!amount || !charityName}
              className="w-full bg-green-600"
            >
              Record Donation
            </Button>
          </div>
        )}

        {/* Reminder & Goal Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Set Reminder */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Bell className="w-4 h-4 text-green-600" />
              Set Reminder
            </div>
            <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={handleSetReminder}>
              Activate Reminder
            </Button>
          </div>

          {/* Link to Goal */}
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Target className="w-4 h-4 text-emerald-600" />
              Charity Goal
            </div>
            {showGoalForm ? (
              <div className="space-y-1.5">
                <Input
                  type="number"
                  placeholder="Target amount ($)"
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  className="h-8 text-xs"
                />
                <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={handleCreateGoal} disabled={!goalAmount || createGoalMutation.isPending}>
                  Create Goal
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs border-emerald-300" onClick={() => setShowGoalForm(true)}>
                Set a Charity Goal
              </Button>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">By Type</h4>
          {Object.entries(byType).map(([type, amount]) => (
            <div key={type} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border">
              <span className="text-sm font-medium capitalize">{type}</span>
              <Badge className="bg-green-100 text-green-800">${amount}</Badge>
            </div>
          ))}
        </div>

        {/* Recent Donations */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-slate-700">Recent</h4>
          {donations.slice(0, 3).map((donation) => (
            <div key={donation.id} className="p-3 bg-white rounded-lg border text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{donation.charity_name}</span>
                <span className="text-green-600 font-semibold">${donation.amount}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(donation.date).toLocaleDateString()} • {donation.type}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}