import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, Plus, Calendar, ExternalLink, Trophy, BookOpen, Heart, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function IslamicAchievementsTracker() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'quran',
    description: '',
    milestone_type: 'other',
    completed_date: format(new Date(), 'yyyy-MM-dd'),
    evidence_url: ''
  });

  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['islamicProfile'],
    queryFn: async () => {
      const profiles = await base44.entities.IslamicProfile.list();
      return profiles[0] || null;
    }
  });

  const addAchievementMutation = useMutation({
    mutationFn: async (achievement) => {
      const currentProfile = profile || {};
      const achievements = currentProfile.achievements || [];
      const updatedAchievements = [...achievements, achievement];

      if (profile?.id) {
        return base44.entities.IslamicProfile.update(profile.id, {
          achievements: updatedAchievements
        });
      } else {
        return base44.entities.IslamicProfile.create({
          achievements: updatedAchievements
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['islamicProfile'] });
      setShowForm(false);
      setFormData({
        title: '',
        category: 'quran',
        description: '',
        milestone_type: 'other',
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        evidence_url: ''
      });
      toast.success('Achievement added!');
    }
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    addAchievementMutation.mutate(formData);
  };

  const categoryColors = {
    quran: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    hadith: 'bg-blue-100 text-blue-800 border-blue-300',
    prayer: 'bg-purple-100 text-purple-800 border-purple-300',
    fasting: 'bg-amber-100 text-amber-800 border-amber-300',
    charity: 'bg-pink-100 text-pink-800 border-pink-300',
    hajj: 'bg-teal-100 text-teal-800 border-teal-300',
    learning: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    character: 'bg-rose-100 text-rose-800 border-rose-300'
  };

  const categoryIcons = {
    quran: BookOpen,
    hadith: BookOpen,
    prayer: Star,
    fasting: Calendar,
    charity: Heart,
    hajj: Trophy,
    learning: BookOpen,
    character: Award
  };

  const achievements = profile?.achievements || [];
  const achievementsByCategory = achievements.reduce((acc, achievement) => {
    const cat = achievement.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(achievement);
    return acc;
  }, {});

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-amber-900">
              <Award className="w-5 h-5" />
              Islamic Achievements
            </span>
            <Button onClick={() => setShowForm(true)} size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-600">{achievements.length}</p>
                  <p className="text-xs text-slate-600">Total Achievements</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {achievementsByCategory['quran']?.length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Quran</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {achievementsByCategory['prayer']?.length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Prayer</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {achievementsByCategory['learning']?.length || 0}
                  </p>
                  <p className="text-xs text-slate-600">Learning</p>
                </div>
              </div>

              {/* Achievements List */}
              <div className="space-y-3">
                {achievements.sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date)).map((achievement, idx) => {
                  const Icon = categoryIcons[achievement.category] || Award;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 bg-white rounded-xl border-2 border-transparent hover:border-amber-300 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${categoryColors[achievement.category]?.replace('text-', 'bg-').replace('800', '200')}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900">{achievement.title}</h4>
                              <p className="text-xs text-slate-500">
                                {format(new Date(achievement.completed_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge className={categoryColors[achievement.category]}>
                              {achievement.category}
                            </Badge>
                          </div>
                          {achievement.description && (
                            <p className="text-sm text-slate-600 mb-2">{achievement.description}</p>
                          )}
                          {achievement.milestone_type !== 'other' && (
                            <Badge variant="outline" className="text-xs">
                              {achievement.milestone_type.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {achievement.evidence_url && (
                            <a
                              href={achievement.evidence_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Certificate
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-amber-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No achievements yet</h3>
              <p className="text-sm text-slate-500 mb-4">
                Start tracking your Islamic milestones and accomplishments
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Achievement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Achievement Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Islamic Achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Achievement Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Completed reading Quran"
              />
            </div>

            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quran">Quran</SelectItem>
                  <SelectItem value="hadith">Hadith</SelectItem>
                  <SelectItem value="prayer">Prayer</SelectItem>
                  <SelectItem value="fasting">Fasting</SelectItem>
                  <SelectItem value="charity">Charity</SelectItem>
                  <SelectItem value="hajj">Hajj/Umrah</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="character">Character</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Milestone Type</Label>
              <Select
                value={formData.milestone_type}
                onValueChange={(val) => setFormData({ ...formData, milestone_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quran_complete">Completed Quran</SelectItem>
                  <SelectItem value="juz_memorized">Juz Memorized</SelectItem>
                  <SelectItem value="hadith_collection">Hadith Collection</SelectItem>
                  <SelectItem value="ramadan_complete">Ramadan Completed</SelectItem>
                  <SelectItem value="charity_goal">Charity Goal</SelectItem>
                  <SelectItem value="daily_prayers_streak">Prayer Streak</SelectItem>
                  <SelectItem value="course_completed">Course Completed</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about this achievement..."
                rows={3}
              />
            </div>

            <div>
              <Label>Completion Date</Label>
              <Input
                type="date"
                value={formData.completed_date}
                onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
              />
            </div>

            <div>
              <Label>Certificate/Evidence URL (Optional)</Label>
              <Input
                value={formData.evidence_url}
                onChange={(e) => setFormData({ ...formData, evidence_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={addAchievementMutation.isPending} className="flex-1 bg-amber-600 hover:bg-amber-700">
                Add Achievement
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}