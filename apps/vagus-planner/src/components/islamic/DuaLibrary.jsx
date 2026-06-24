import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart, HandHeart, Search, Star, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OCCASIONS = [
  { key: 'all', icon: '⭐', label: 'All' },
  { key: 'morning', icon: '🌅', label: 'Morning' },
  { key: 'evening', icon: '🌆', label: 'Evening' },
  { key: 'before_sleep', icon: '🌙', label: 'Sleep' },
  { key: 'after_prayer', icon: '🤲', label: 'After Prayer' },
  { key: 'traveling', icon: '✈️', label: 'Travel' },
  { key: 'eating', icon: '🍽️', label: 'Eating' },
  { key: 'difficulty', icon: '💪', label: 'Difficulty' },
  { key: 'gratitude', icon: '🙏', label: 'Gratitude' },
  { key: 'favorites', icon: '❤️', label: 'Favorites' },
];

function DuaCard({ dua, onToggleFav, toggling }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/70 dark:bg-slate-800/60 rounded-xl border border-purple-100 dark:border-purple-900 overflow-hidden"
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <HandHeart className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-purple-900 dark:text-purple-100 truncate">{dua.title}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(dua); }}
            disabled={toggling}
            className="p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
          >
            <Heart className={cn('w-4 h-4', dua.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400 dark:text-slate-500')} />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-purple-100 dark:border-purple-900 pt-3">
              {dua.arabic_text && (
                <p className="text-right text-xl leading-loose text-purple-900 dark:text-purple-100 bg-purple-50/70 dark:bg-purple-950/40 rounded-lg p-3"
                  dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2.2' }}>
                  {dua.arabic_text}
                </p>
              )}
              {dua.transliteration && (
                <p className="text-sm italic text-purple-700 dark:text-purple-300">{dua.transliteration}</p>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{dua.english_translation}</p>
              {dua.benefits && (
                <div className="bg-purple-50 dark:bg-purple-950/50 rounded-lg p-2.5">
                  <p className="text-xs text-purple-700 dark:text-purple-300">💫 {dua.benefits}</p>
                </div>
              )}
              {dua.reference && (
                <p className="text-xs text-purple-500 dark:text-purple-400">{dua.reference}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DuaLibrary() {
  const [occasion, setOccasion] = useState('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: duas = [], isLoading } = useQuery({
    queryKey: ['daily-duas'],
    queryFn: () => base44.entities.DailyDua.list('-created_date', 200),
    initialData: [],
  });

  const { mutate: toggleFav, variables: toggling } = useMutation({
    mutationFn: (dua) => base44.entities.DailyDua.update(dua.id, { is_favorite: !dua.is_favorite }),
    onSuccess: (_, dua) => {
      queryClient.invalidateQueries({ queryKey: ['daily-duas'] });
      toast.success(dua.is_favorite ? "Removed from favorites" : "Added to favorites ❤️");
    },
  });

  const filtered = duas.filter(d => {
    if (occasion === 'favorites' && !d.is_favorite) return false;
    if (occasion !== 'all' && occasion !== 'favorites' && d.occasion !== occasion) return false;
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase()) && !d.english_translation?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <HandHeart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-purple-900 dark:text-purple-100">Du'a Library</h3>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Supplications & Dhikr</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search duas…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white/70 dark:bg-slate-800/60 border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600 text-slate-700 dark:text-slate-200"
          />
        </div>

        {/* Occasion filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 hide-scrollbar">
          {OCCASIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setOccasion(o.key)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                occasion === o.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-purple-100 dark:border-purple-800 hover:border-purple-300'
              )}
            >
              <span>{o.icon}</span> {o.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <HandHeart className="w-12 h-12 text-purple-200 dark:text-purple-800 mx-auto mb-2" />
            <p className="text-sm text-purple-500 dark:text-purple-400">
              {occasion === 'favorites' ? 'No favourites yet — tap ❤️ to save a du\'a' : 'No duas found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 hide-scrollbar">
            {filtered.map(d => (
              <DuaCard key={d.id} dua={d} onToggleFav={toggleFav} toggling={toggling?.id === d.id} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}