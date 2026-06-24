import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Heart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function HadithOfDay({ compact = false }) {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: hadiths = [], isLoading } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => base44.entities.Hadith.list('-created_date', 50),
    initialData: []
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.Hadith.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('Hadith saved to favorites!');
    }
  });

  const refreshHadith = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['hadiths'] });
    setTimeout(() => setRefreshing(false), 500);
  };

  // Get random hadith or first one
  const hadith = hadiths.length > 0 
    ? hadiths[Math.floor(Math.random() * Math.min(hadiths.length, 10))]
    : null;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-6">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
      </Card>
    );
  }

  if (!hadith) {
    return null;
  }

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-amber-900">Hadith of the Day</h3>
          </div>
          <p className="text-sm text-slate-700 line-clamp-2">
            {hadith.english_translation}
          </p>
          <p className="text-xs text-amber-700 mt-2">
            — {hadith.source}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-amber-900">Hadith of the Day</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshHadith}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`w-4 h-4 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavoriteMutation.mutate({ 
                id: hadith.id, 
                isFavorite: hadith.is_favorite 
              })}
              className="h-8 w-8"
            >
              <Heart className={`w-4 h-4 ${hadith.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-amber-600'}`} />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={hadith.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {hadith.arabic_text && (
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl">
                <p className="text-right text-xl leading-loose font-arabic text-amber-900" dir="rtl">
                  {hadith.arabic_text}
                </p>
              </div>
            )}

            <div className="p-4 bg-white/40 rounded-xl">
              <p className="text-slate-700 leading-relaxed">
                {hadith.english_translation}
              </p>
            </div>

            {hadith.narrator && (
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <span className="font-medium">Narrated by:</span>
                <span>{hadith.narrator}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-800">
                  {hadith.source}
                </span>
              </div>
              {hadith.reference && (
                <span className="text-xs text-amber-600 bg-white/50 px-2 py-1 rounded-full">
                  {hadith.reference}
                </span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}