import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HandHeart, RefreshCw, Heart, Loader2, Clock, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const OCCASIONS = {
  morning: { icon: '🌅', label: 'Morning' },
  evening: { icon: '🌆', label: 'Evening' },
  before_sleep: { icon: '🌙', label: 'Before Sleep' },
  after_prayer: { icon: '🤲', label: 'After Prayer' },
  traveling: { icon: '✈️', label: 'Traveling' },
  eating: { icon: '🍽️', label: 'Eating' },
  difficulty: { icon: '💪', label: 'In Difficulty' },
  gratitude: { icon: '🙏', label: 'Gratitude' },
  general: { icon: '⭐', label: 'General' }
};

export default function DailyDuaCard() {
  const [selectedOccasion, setSelectedOccasion] = useState('morning');
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: duas = [], isLoading } = useQuery({
    queryKey: ['daily-duas'],
    queryFn: () => base44.entities.DailyDua.list('-created_date', 100),
    initialData: []
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.DailyDua.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-duas'] });
      toast.success('Du\'a saved to favorites!');
    }
  });

  const refreshDua = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['daily-duas'] });
    setTimeout(() => setRefreshing(false), 500);
  };

  const occasionDuas = duas.filter(d => d.occasion === selectedOccasion);
  // Stable selection based on today's date so it doesn't flicker on re-render
  const todayIndex = new Date().getDate();
  const dua = occasionDuas.length > 0 
    ? occasionDuas[todayIndex % occasionDuas.length]
    : null;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-800 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-purple-900 dark:text-purple-100">Daily Du'a</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshDua}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Occasion Selector */}
        <div className="mb-4">
          <select
            value={selectedOccasion}
            onChange={(e) => setSelectedOccasion(e.target.value)}
            className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white/80 dark:bg-slate-800/80 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
          >
            {Object.entries(OCCASIONS).map(([key, { icon, label }]) => (
              <option key={key} value={key}>
                {icon} {label}
              </option>
            ))}
          </select>
        </div>

        {dua ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={dua.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">{dua.title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavoriteMutation.mutate({ 
                    id: dua.id, 
                    isFavorite: dua.is_favorite 
                  })}
                  className="h-8 w-8"
                >
                  <Heart className={`w-4 h-4 ${dua.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-purple-600 dark:text-purple-400'}`} />
                </Button>
              </div>

              {dua.arabic_text && (
                <div className="p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl">
                  <p className="text-xl leading-loose text-purple-900 dark:text-purple-100 text-right" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2.2' }}>
                    {dua.arabic_text}
                  </p>
                </div>
              )}

              {dua.transliteration && (
                <div className="p-3 bg-white/40 dark:bg-slate-800/40 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300 italic">
                    {dua.transliteration}
                  </p>
                </div>
              )}

              <div className="p-4 bg-white/40 dark:bg-slate-800/40 rounded-xl">
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  {dua.english_translation}
                </p>
              </div>

              {dua.benefits && (
                <div className="bg-purple-100 dark:bg-purple-900/40 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                  <p className="text-xs font-medium text-purple-900 dark:text-purple-200 mb-1">
                    💫 Benefits
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">{dua.benefits}</p>
                </div>
              )}

              {dua.reference && (
                <div className="flex items-center justify-between pt-3 border-t border-purple-200 dark:border-purple-700">
                  <span className="text-xs text-purple-600 dark:text-purple-300 bg-white/50 dark:bg-slate-800/50 px-2 py-1 rounded-full">
                    {dua.reference}
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-8">
            <HandHeart className="w-12 h-12 text-purple-300 dark:text-purple-700 mx-auto mb-3" />
            <p className="text-sm text-purple-600 dark:text-purple-400">
              No du'as available for this occasion yet
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}