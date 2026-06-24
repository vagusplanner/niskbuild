import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  BookOpen, Check, Star, Heart, Plus, Calendar,
  Sparkles, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRACTICE_TYPES = [
  { type: 'quran', label: 'Quran Reading', icon: BookOpen, color: 'emerald' },
  { type: 'prayer', label: 'Voluntary Prayer', icon: Star, color: 'purple' },
  { type: 'dhikr', label: 'Dhikr', icon: Heart, color: 'rose' },
  { type: 'charity', label: 'Charity/Sadaqah', icon: Heart, color: 'teal' },
  { type: 'fasting', label: 'Voluntary Fasting', icon: Star, color: 'amber' }
];

export default function IslamicPracticeLogger({ isOpen, onClose }) {
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({
    pages: '',
    duration_minutes: '',
    count: '',
    amount: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recentIslamicPractices'],
    queryFn: async () => {
      const [quranLogs, prayerLogs] = await Promise.all([
        SDK.entities.QuranReading.list('-created_date', 5),
        SDK.entities.PrayerLog.list('-created_date', 5)
      ]);
      return [...quranLogs, ...prayerLogs].sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 5);
    },
    enabled: isOpen
  });

  const logQuranMutation = useMutation({
    mutationFn: (data) => SDK.entities.QuranReading.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentIslamicPractices'] });
      queryClient.invalidateQueries({ queryKey: ['quranReadings'] });
      toast.success('Quran reading logged! 📖');
      resetForm();
    }
  });

  const logPrayerMutation = useMutation({
    mutationFn: (data) => SDK.entities.PrayerLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentIslamicPractices'] });
      queryClient.invalidateQueries({ queryKey: ['prayerLogs'] });
      toast.success('Prayer logged! 🤲');
      resetForm();
    }
  });

  const logCharityMutation = useMutation({
    mutationFn: (data) => SDK.entities.CharityDonation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charityDonations'] });
      toast.success('Charity logged! May Allah accept it 💚');
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({ pages: '', duration_minutes: '', count: '', amount: '', notes: '' });
    setSelectedType(null);
  };

  const handleSubmit = () => {
    if (!selectedType) return;

    const date = new Date().toISOString().split('T')[0];

    switch (selectedType.type) {
      case 'quran':
        if (!formData.pages) {
          toast.error('Please enter number of pages');
          return;
        }
        logQuranMutation.mutate({
          date,
          pages_read: parseInt(formData.pages),
          duration_minutes: parseInt(formData.duration_minutes) || 0,
          notes: formData.notes
        });
        break;

      case 'prayer':
        if (!formData.count) {
          toast.error('Please enter number of rakah');
          return;
        }
        logPrayerMutation.mutate({
          date,
          prayer_type: 'voluntary',
          rakah_count: parseInt(formData.count),
          notes: formData.notes
        });
        break;

      case 'charity':
        if (!formData.amount) {
          toast.error('Please enter amount');
          return;
        }
        logCharityMutation.mutate({
          date,
          amount: parseFloat(formData.amount),
          type: 'sadaqah',
          charity_name: 'General Charity',
          notes: formData.notes
        });
        break;

      case 'dhikr':
        toast.info('Dhikr logging - use Dhikr Counter for detailed tracking');
        resetForm();
        break;

      case 'fasting':
        // Create fasting record
        SDK.entities.FastingRecord.create({
          date,
          type: 'voluntary',
          completed: true,
          notes: formData.notes
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['fastingRecords'] });
          toast.success('Fasting logged! 🌙');
          resetForm();
        });
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Log Islamic Practice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Practice Type Selection */}
          {!selectedType ? (
            <div className="grid grid-cols-2 gap-3">
              {PRACTICE_TYPES.map((practice) => {
                const Icon = practice.icon;
                return (
                  <motion.button
                    key={practice.type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedType(practice)}
                    className={`p-6 rounded-xl border-2 border-${practice.color}-200 bg-${practice.color}-50 hover:bg-${practice.color}-100 transition-all group`}
                  >
                    <Icon className={`w-8 h-8 text-${practice.color}-600 mx-auto mb-2`} />
                    <p className="font-medium text-slate-800">{practice.label}</p>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Practice Header */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <selectedType.icon className={`w-6 h-6 text-${selectedType.color}-600`} />
                  <h3 className="font-semibold text-slate-800">{selectedType.label}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Change
                </Button>
              </div>

              {/* Form Fields Based on Type */}
              {selectedType.type === 'quran' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Pages Read</label>
                    <Input
                      type="number"
                      value={formData.pages}
                      onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                      placeholder="e.g., 2"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {selectedType.type === 'prayer' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Number of Rakah</label>
                  <Input
                    type="number"
                    value={formData.count}
                    onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                    placeholder="e.g., 2, 4, 8"
                    className="mt-1"
                  />
                </div>
              )}

              {selectedType.type === 'charity' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g., 10.00"
                    className="mt-1"
                  />
                </div>
              )}

              {/* Notes - Common */}
              <div>
                <label className="text-sm font-medium text-slate-700">Notes (Optional)</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add reflection or details..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full bg-teal-600 hover:bg-teal-700">
                <Check className="w-4 h-4 mr-2" />
                Log {selectedType.label}
              </Button>
            </div>
          )}

          {/* Recent Logs */}
          {recentLogs.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h4 className="font-medium text-slate-700">Recent Activity</h4>
              </div>
              <div className="space-y-2">
                {recentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {log.pages_read ? `📖 ${log.pages_read} pages` : 
                         log.rakah_count ? `🤲 ${log.rakah_count} rakah` : 
                         'Islamic practice'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(log.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}