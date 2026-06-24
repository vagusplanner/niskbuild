import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Plus, TrendingUp, Calendar, Award, Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SadaqahTracker() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDonation, setNewDonation] = useState({
    type: 'sadaqah',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    recipient: '',
    category: 'general',
    recurring: false,
    recurring_frequency: 'monthly',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: donations = [] } = useQuery({
    queryKey: ['charitableGiving'],
    queryFn: () => base44.entities.CharitableGiving.list('-date', 50)
  });

  const createDonationMutation = useMutation({
    mutationFn: async (data) => {
      const donation = await base44.entities.CharitableGiving.create(data);
      
      // Award gamification points
      await base44.functions.invoke('awardPoints', {
        points: Math.floor(data.amount / 10),
        reason: `${data.type} donation of $${data.amount}`,
        category: 'charity'
      });

      // If recurring, schedule calendar events
      if (data.recurring) {
        await base44.entities.Event.create({
          title: `${data.type === 'sadaqah' ? 'Sadaqah' : 'Zakat'} Payment`,
          description: `Recurring ${data.type} to ${data.recipient} - $${data.amount}`,
          start_date: data.date,
          end_date: data.date,
          category: 'other',
          is_all_day: true,
          is_recurring: true,
          recurrence_type: data.recurring_frequency === 'daily' ? 'daily' :
                          data.recurring_frequency === 'weekly' ? 'weekly' :
                          data.recurring_frequency === 'monthly' ? 'monthly' : 'yearly',
          recurrence_interval: 1,
          reminders: [{ minutes_before: 1440, type: 'notification' }]
        });
      }

      return donation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charitableGiving'] });
      queryClient.invalidateQueries({ queryKey: ['gamificationPoints'] });
      setShowAddDialog(false);
      setNewDonation({
        type: 'sadaqah',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        recipient: '',
        category: 'general',
        recurring: false,
        recurring_frequency: 'monthly',
        notes: ''
      });
      toast.success('Donation recorded! Points awarded 🎉');
    }
  });

  const handleSubmit = () => {
    if (!newDonation.amount || !newDonation.recipient) {
      toast.error('Please fill in amount and recipient');
      return;
    }

    createDonationMutation.mutate({
      ...newDonation,
      amount: parseFloat(newDonation.amount),
      currency: 'USD'
    });
  };

  // Statistics
  const totalThisMonth = donations
    .filter(d => {
      const donationDate = new Date(d.date);
      const now = new Date();
      return donationDate.getMonth() === now.getMonth() && 
             donationDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, d) => sum + d.amount, 0);

  const totalThisYear = donations
    .filter(d => new Date(d.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, d) => sum + d.amount, 0);

  const sadaqahTotal = donations
    .filter(d => d.type === 'sadaqah')
    .reduce((sum, d) => sum + d.amount, 0);

  const zakatTotal = donations
    .filter(d => d.type === 'zakat')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-rose-900">
              <Heart className="w-5 h-5 fill-rose-500" />
              Sadaqah Tracker
            </CardTitle>
            <CardDescription>
              Track voluntary charity and build giving habits
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Donation
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-lg border border-rose-200">
            <p className="text-xs text-slate-600 mb-1">This Month</p>
            <p className="text-lg font-bold text-rose-700">
              ${totalThisMonth.toFixed(2)}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-pink-200">
            <p className="text-xs text-slate-600 mb-1">This Year</p>
            <p className="text-lg font-bold text-pink-700">
              ${totalThisYear.toFixed(2)}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-emerald-200">
            <p className="text-xs text-slate-600 mb-1">Sadaqah Total</p>
            <p className="text-lg font-bold text-emerald-700">
              ${sadaqahTotal.toFixed(2)}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-teal-200">
            <p className="text-xs text-slate-600 mb-1">Zakat Total</p>
            <p className="text-lg font-bold text-teal-700">
              ${zakatTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Recent Donations */}
        <div className="space-y-3">
          <h3 className="font-semibold text-rose-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Recent Donations
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {donations.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-rose-300 mx-auto mb-3" />
                  <p className="text-rose-600">No donations recorded yet</p>
                  <p className="text-sm text-rose-500 mt-1">Start tracking your charitable giving!</p>
                </div>
              ) : (
                donations.slice(0, 10).map((donation, idx) => (
                  <motion.div
                    key={donation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-white rounded-lg border border-rose-100 hover:border-rose-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={
                            donation.type === 'zakat' ? 'bg-emerald-100 text-emerald-700' :
                            donation.type === 'sadaqah' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }>
                            {donation.type}
                          </Badge>
                          {donation.recurring && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {donation.recurring_frequency}
                            </Badge>
                          )}
                          {donation.gamification_points_awarded && (
                            <Award className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="font-semibold text-slate-800">
                          {donation.recipient}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {donation.category.replace('_', ' ')}
                        </p>
                        {donation.notes && (
                          <p className="text-xs text-slate-600 mt-1">
                            {donation.notes}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {format(new Date(donation.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-rose-700">
                          ${donation.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>

      {/* Add Donation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Donation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Type</Label>
              <Select
                value={newDonation.type}
                onValueChange={(v) => setNewDonation({...newDonation, type: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select donation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sadaqah">Sadaqah (Voluntary)</SelectItem>
                  <SelectItem value="zakat">Zakat</SelectItem>
                  <SelectItem value="fidya">Fidya</SelectItem>
                  <SelectItem value="kaffarah">Kaffarah</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={newDonation.amount}
                onChange={(e) => setNewDonation({...newDonation, amount: e.target.value})}
              />
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newDonation.date}
                onChange={(e) => setNewDonation({...newDonation, date: e.target.value})}
              />
            </div>

            <div>
              <Label>Recipient</Label>
              <Input
                placeholder="e.g., Local Mosque, Islamic Relief"
                value={newDonation.recipient}
                onChange={(e) => setNewDonation({...newDonation, recipient: e.target.value})}
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={newDonation.category}
                onValueChange={(v) => setNewDonation({...newDonation, category: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mosque">Mosque</SelectItem>
                  <SelectItem value="orphans">Orphans</SelectItem>
                  <SelectItem value="poor">Poor & Needy</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="disaster_relief">Disaster Relief</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <Label className="text-base">Recurring Donation</Label>
                <p className="text-xs text-slate-500">Set up automatic reminders</p>
              </div>
              <Switch
                checked={newDonation.recurring}
                onCheckedChange={(checked) => setNewDonation({...newDonation, recurring: checked})}
              />
            </div>

            {newDonation.recurring && (
              <div>
                <Label>Frequency</Label>
                <Select
                  value={newDonation.recurring_frequency}
                  onValueChange={(v) => setNewDonation({...newDonation, recurring_frequency: v})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={newDonation.notes}
                onChange={(e) => setNewDonation({...newDonation, notes: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createDonationMutation.isPending}
                className="flex-1 bg-rose-600 hover:bg-rose-700"
              >
                {createDonationMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Record Donation'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}