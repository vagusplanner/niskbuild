import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Plus, 
  Check, 
  Star, 
  Calendar,
  TrendingUp,
  Target,
  Award,
  Brain,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  Trophy
} from 'lucide-react';
import VerseDisplay from './VerseDisplay';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SURAHS = [
  { number: 1, name: "Al-Fatihah", verses: 7 },
  { number: 2, name: "Al-Baqarah", verses: 286 },
  { number: 3, name: "Ali 'Imran", verses: 200 },
  { number: 4, name: "An-Nisa", verses: 176 },
  { number: 5, name: "Al-Ma'idah", verses: 120 },
  { number: 6, name: "Al-An'am", verses: 165 },
  { number: 7, name: "Al-A'raf", verses: 206 },
  { number: 18, name: "Al-Kahf", verses: 110 },
  { number: 36, name: "Ya-Sin", verses: 83 },
  { number: 67, name: "Al-Mulk", verses: 30 },
  { number: 78, name: "An-Naba", verses: 40 },
  { number: 112, name: "Al-Ikhlas", verses: 4 },
  { number: 113, name: "Al-Falaq", verses: 5 },
  { number: 114, name: "An-Nas", verses: 6 }
];

const STATUS_CONFIG = {
  memorizing: { label: 'Memorizing', color: 'bg-blue-100 text-blue-800', icon: Brain },
  memorized: { label: 'Memorized', color: 'bg-green-100 text-green-800', icon: Check },
  reviewing: { label: 'Reviewing', color: 'bg-purple-100 text-purple-800', icon: RotateCcw },
  needs_review: { label: 'Needs Review', color: 'bg-orange-100 text-orange-800', icon: Calendar }
};

export default function QuranMemorizationTracker({ compact = false }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const queryClient = useQueryClient();

  // Form states
  const [formData, setFormData] = useState({
    surah_number: '',
    from_verse: '',
    to_verse: '',
    notes: ''
  });

  const [goalData, setGoalData] = useState({
    title: '',
    goal_type: 'daily_verses',
    target_verses_per_day: 5,
    target_verses_per_week: 35
  });

  // Fetch data
  const { data: memorizations = [], isLoading } = useQuery({
    queryKey: ['quran-memorizations'],
    queryFn: () => SDK.entities.QuranMemorization.list('-created_date')
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['memorization-goals'],
    queryFn: () => SDK.entities.MemorizationGoal.list('-created_date')
  });

  // Mutations
  const addMemorization = useMutation({
    mutationFn: (data) => SDK.entities.QuranMemorization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quran-memorizations']);
      setShowAddForm(false);
      setFormData({ surah_number: '', from_verse: '', to_verse: '', notes: '' });
      toast.success('Added to memorization list');
    }
  });

  const updateMemorization = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.QuranMemorization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['quran-memorizations']);
      toast.success('Updated successfully');
    }
  });

  const deleteMemorization = useMutation({
    mutationFn: (id) => SDK.entities.QuranMemorization.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quran-memorizations']);
      toast.success('Removed from list');
    }
  });

  const addGoal = useMutation({
    mutationFn: async (data) => {
      const goal = await SDK.entities.MemorizationGoal.create(data);
      // Also create a linked spiritual Goal for tracking in Goals panel
      await SDK.entities.Goal.create({
        title: data.title,
        category: 'spiritual',
        status: 'in_progress',
        description: `Quran memorization: ${data.target_verses_per_day} verses/day`,
        progress: 0,
      });
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memorization-goals'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowGoalForm(false);
      toast.success('Memorization goal created and linked to Goals! 🎯');
    }
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.MemorizationGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['memorization-goals']);
    }
  });

  // Handlers
  const handleAddMemorization = () => {
    const surah = SURAHS.find(s => s.number === parseInt(formData.surah_number));
    if (!surah) return;

    const from = parseInt(formData.from_verse);
    const to = parseInt(formData.to_verse);
    const total_verses = to - from + 1;

    addMemorization.mutate({
      surah_number: surah.number,
      surah_name: surah.name,
      from_verse: from,
      to_verse: to,
      total_verses,
      notes: formData.notes,
      status: 'memorizing'
    });
  };

  // Spaced repetition: SM-2 algorithm simplified
  // Returns next review date based on review count and accuracy rating
  const getNextReviewDate = (reviewCount, accuracyRating) => {
    const intervals = [1, 3, 7, 14, 30, 60, 120]; // days
    const idx = Math.min(reviewCount, intervals.length - 1);
    // Reduce interval if accuracy is low
    const multiplier = accuracyRating >= 4 ? 1 : accuracyRating >= 3 ? 0.7 : 0.4;
    return format(addDays(new Date(), Math.round(intervals[idx] * multiplier)), 'yyyy-MM-dd');
  };

  const handleStatusChange = async (mem, newStatus) => {
    const updates = { status: newStatus };
    
    if (newStatus === 'memorized' && !mem.memorized_date) {
      updates.memorized_date = format(new Date(), 'yyyy-MM-dd');
      updates.next_review_date = getNextReviewDate(0, 3);
      
      // Create a calendar review reminder
      try {
        const reviewDate = addDays(new Date(), 3);
        await SDK.entities.Event.create({
          title: `📖 Review: ${mem.surah_name} (${mem.from_verse}-${mem.to_verse})`,
          start_date: reviewDate.toISOString(),
          end_date: new Date(reviewDate.getTime() + 15 * 60000).toISOString(),
          category: 'prayer',
          description: `Spaced repetition review for memorized verses. Accuracy target: 4/5 stars.`,
          color: '#8b5cf6',
        });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } catch (_) {}

      try {
        const result = await SDK.functions.invoke('awardMemorizationPoints', {
          memorization_id: mem.id, action: 'memorized'
        });
        if (result.data?.points_awarded > 0) toast.success(`🎉 ${result.data.message}`, { duration: 5000 });
      } catch (_) {}
    }
    
    if (newStatus === 'reviewing') {
      const reviewCount = (mem.review_count || 0) + 1;
      updates.last_reviewed_date = format(new Date(), 'yyyy-MM-dd');
      updates.review_count = reviewCount;
      updates.next_review_date = getNextReviewDate(reviewCount, mem.accuracy_rating || 3);
      
      try {
        await SDK.functions.invoke('awardMemorizationPoints', {
          memorization_id: mem.id, action: 'reviewed'
        });
      } catch (_) {}
    }

    updateMemorization.mutate({ id: mem.id, data: updates });
  };

  const handleRatingChange = (mem, rating) => {
    updateMemorization.mutate({ 
      id: mem.id, 
      data: { accuracy_rating: rating }
    });
  };

  // Statistics
  const today = format(new Date(), 'yyyy-MM-dd');
  const dueForReview = memorizations.filter(m =>
    m.status === 'memorized' && m.next_review_date && m.next_review_date <= today
  );

  const stats = {
    total: memorizations.length,
    memorized: memorizations.filter(m => m.status === 'memorized').length,
    memorizing: memorizations.filter(m => m.status === 'memorizing').length,
    totalVerses: memorizations.reduce((sum, m) => sum + (m.total_verses || 0), 0),
    memorizedVerses: memorizations
      .filter(m => m.status === 'memorized')
      .reduce((sum, m) => sum + (m.total_verses || 0), 0),
    dueForReview: dueForReview.length,
  };

  const activeGoal = goals.find(g => g.status === 'active');
  const progressPercent = activeGoal 
    ? Math.min((stats.memorizedVerses / (activeGoal.total_target_verses || 1)) * 100, 100)
    : 0;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-900">Memorization</span>
            </div>
            <div className="flex gap-1">
              {stats.dueForReview > 0 && (
                <Badge className="bg-orange-500 text-white text-[10px]">
                  {stats.dueForReview} due
                </Badge>
              )}
              <Badge className="bg-purple-600 text-white">
                {stats.memorizedVerses} verses
              </Badge>
            </div>
          </div>
          {activeGoal && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-purple-700">{activeGoal.title}</span>
                <span className="text-purple-600 font-medium">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gamification Stats */}
      <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-600">Reward Points</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">
                {stats.memorizedVerses * 10}
              </div>
              <p className="text-xs text-yellow-600">earned from {stats.memorized} sections</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">Memorizing</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{stats.memorizing}</div>
            <p className="text-xs text-blue-600">sections</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Memorized</span>
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.memorized}</div>
            <p className="text-xs text-green-600">sections</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">Total Verses</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">{stats.memorizedVerses}</div>
            <p className="text-xs text-purple-600">memorized</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-600">Progress</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">{Math.round(progressPercent)}%</div>
            <p className="text-xs text-amber-600">of goal</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Goal */}
      {activeGoal && (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                <Award className="w-5 h-5" />
                {activeGoal.title}
              </CardTitle>
              <Badge className="bg-indigo-600 text-white">Active Goal</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-indigo-700">
                <span>Progress: {stats.memorizedVerses} / {activeGoal.total_target_verses || 0} verses</span>
                <span className="font-semibold">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-3 bg-white/60 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-900">{activeGoal.target_verses_per_day || 0}</div>
                  <div className="text-xs text-indigo-600">verses/day target</div>
                </div>
                <div className="text-center p-3 bg-white/60 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-900">{activeGoal.streak || 0}</div>
                  <div className="text-xs text-indigo-600">day streak</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="memorizing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="memorizing">Memorizing</TabsTrigger>
          <TabsTrigger value="memorized">Memorized</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="memorizing" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-purple-200">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Surah</Label>
                        <Select
                          value={formData.surah_number}
                          onValueChange={(value) => setFormData({ ...formData, surah_number: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Surah" />
                          </SelectTrigger>
                          <SelectContent>
                            {SURAHS.map(surah => (
                              <SelectItem key={surah.number} value={surah.number.toString()}>
                                {surah.number}. {surah.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Verses</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="From"
                            value={formData.from_verse}
                            onChange={(e) => setFormData({ ...formData, from_verse: e.target.value })}
                          />
                          <Input
                            type="number"
                            placeholder="To"
                            value={formData.to_verse}
                            onChange={(e) => setFormData({ ...formData, to_verse: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>Notes (optional)</Label>
                      <Textarea
                        placeholder="Tips or reminders..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddMemorization} className="flex-1">
                        Add to List
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memorizing List */}
          <div className="space-y-3">
            {memorizations
              .filter(m => m.status === 'memorizing' || m.status === 'reviewing' || m.status === 'needs_review')
              .map(mem => (
                <MemorizationCard
                  key={mem.id}
                  memorization={mem}
                  onStatusChange={handleStatusChange}
                  onRatingChange={handleRatingChange}
                  onDelete={() => deleteMemorization.mutate(mem.id)}
                  expanded={expandedSection === mem.id}
                  onToggleExpand={() => setExpandedSection(expandedSection === mem.id ? null : mem.id)}
                />
              ))}
            {memorizations.filter(m => m.status === 'memorizing' || m.status === 'reviewing').length === 0 && (
              <Card className="p-8 text-center text-slate-500">
                <Brain className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No sections in progress. Add a new section to start memorizing!</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="memorized" className="space-y-4 mt-4">
          <div className="grid gap-3">
            {memorizations
              .filter(m => m.status === 'memorized')
              .map(mem => (
                <Card key={mem.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-green-900">
                            {mem.surah_name} ({mem.from_verse}-{mem.to_verse})
                          </h3>
                        </div>
                        <div className="flex gap-4 text-sm text-green-700">
                          <span>📖 {mem.total_verses} verses</span>
                          <span>📅 {mem.memorized_date && format(new Date(mem.memorized_date), 'MMM d, yyyy')}</span>
                          {mem.review_count > 0 && <span>🔄 {mem.review_count} reviews</span>}
                        </div>
                        {mem.accuracy_rating && (
                          <div className="flex gap-1 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= mem.accuracy_rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(mem, 'reviewing')}
                        className="border-green-300"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {memorizations.filter(m => m.status === 'memorized').length === 0 && (
              <Card className="p-8 text-center text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No memorized sections yet. Keep up the great work!</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowGoalForm(!showGoalForm)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </div>

          <AnimatePresence>
            {showGoalForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-indigo-200">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label>Goal Title</Label>
                      <Input
                        placeholder="e.g., Memorize Surah Al-Mulk"
                        value={goalData.title}
                        onChange={(e) => setGoalData({ ...goalData, title: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Daily Target (verses)</Label>
                        <Input
                          type="number"
                          value={goalData.target_verses_per_day}
                          onChange={(e) => setGoalData({ ...goalData, target_verses_per_day: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Weekly Target (verses)</Label>
                        <Input
                          type="number"
                          value={goalData.target_verses_per_week}
                          onChange={(e) => setGoalData({ ...goalData, target_verses_per_week: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          addGoal.mutate({
                            ...goalData,
                            start_date: format(new Date(), 'yyyy-MM-dd'),
                            total_target_verses: goalData.target_verses_per_week * 4
                          });
                        }}
                        className="flex-1"
                      >
                        Create Goal
                      </Button>
                      <Button variant="outline" onClick={() => setShowGoalForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Goals List */}
          <div className="space-y-3">
            {goals.map(goal => (
              <Card key={goal.id} className="border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{goal.title}</h3>
                      <Badge className={goal.status === 'active' ? 'bg-green-600' : 'bg-gray-600'}>
                        {goal.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm text-slate-600">
                    <div>📊 {goal.current_verses_memorized || 0} / {goal.total_target_verses} verses</div>
                    <div>📅 {goal.target_verses_per_day} verses/day</div>
                    <div>🔥 {goal.streak || 0} day streak</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemorizationCard({ memorization, onStatusChange, onRatingChange, onDelete, expanded, onToggleExpand }) {
  const [showVerses, setShowVerses] = useState(false);
  const statusConfig = STATUS_CONFIG[memorization.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-900">
                {memorization.surah_name} ({memorization.from_verse}-{memorization.to_verse})
              </h3>
              <Badge className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex gap-4 text-sm text-purple-700">
              <span>📖 {memorization.total_verses} verses</span>
              {memorization.review_count > 0 && <span>🔄 {memorization.review_count} reviews</span>}
            </div>

            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3"
              >
                {memorization.notes && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700">{memorization.notes}</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm text-purple-700">Confidence Level</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => onRatingChange(memorization, star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= (memorization.accuracy_rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowVerses(!showVerses)}
                  className="w-full border-teal-300 text-teal-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showVerses ? 'Hide' : 'Show'} Verses for Practice
                </Button>

                {showVerses && (
                  <VerseDisplay
                    surahNumber={memorization.surah_number}
                    fromVerse={memorization.from_verse}
                    toVerse={memorization.to_verse}
                    onMarkMemorized={() => onStatusChange(memorization, 'memorized')}
                    isMemorized={memorization.status === 'memorized'}
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(memorization, 'memorized')}
                    className="flex-1 border-green-300 text-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Mark Memorized
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(memorization, 'reviewing')}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onDelete}
                    className="border-red-300 text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleExpand}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}