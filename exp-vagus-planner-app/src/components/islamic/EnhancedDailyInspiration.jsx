import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, RefreshCw, Heart, Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EnhancedDailyInspiration({ compact = false }) {
  const [verse, setVerse] = useState(null);
  const [reflection, setReflection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verse');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Fetch both verse and reflection in parallel
      const [verseData, reflectionData] = await Promise.all([
        loadVerse(today),
        loadReflection()
      ]);
      
      setVerse(verseData);
      setReflection(reflectionData);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Could not load daily inspiration');
    } finally {
      setLoading(false);
    }
  };

  const loadVerse = async (today) => {
    const existingVerses = await SDK.entities.QuranVerse.filter({ date: today });
    
    if (existingVerses.length > 0) {
      return existingVerses[0];
    }
    
    const settings = await SDK.entities.UserSettings.list();
    const events = await SDK.entities.Event.list('-start_date', 10);
    
    const result = await SDK.functions.invoke('generateDailyQuranVerse', {
      date: today,
      user_interests: settings[0]?.focus_areas || [],
      recent_activities: events.map(e => e.title).slice(0, 5)
    });
    
    return result.data.verse;
  };

  const loadReflection = async () => {
    const settings = await SDK.entities.UserSettings.list();
    const events = await SDK.entities.Event.list('-start_date', 10);
    const tasks = await SDK.entities.Task.list('-updated_date', 10);
    
    const result = await SDK.integrations.Core.InvokeLLM({
      prompt: `Generate a concise, personalized daily reflection based on the user's activities.

Recent events: ${events.slice(0, 5).map(e => e.title).join(', ')}
Recent tasks: ${tasks.slice(0, 5).map(t => t.title).join(', ')}
Focus areas: ${settings[0]?.focus_areas?.join(', ') || 'General wellness'}

Provide:
1. A brief, motivating message (2-3 sentences)
2. One key insight for today
3. One practical action

Be concise, warm, and actionable.`,
      response_json_schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          key_insight: { type: "string" },
          action: { type: "string" }
        }
      }
    });
    
    return result;
  };

  const toggleFavorite = async () => {
    if (!verse) return;
    
    try {
      await SDK.entities.QuranVerse.update(verse.id, {
        is_favorite: !verse.is_favorite
      });
      setVerse({ ...verse, is_favorite: !verse.is_favorite });
      toast.success(verse.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Could not update');
    }
  };

  if (loading) {
    return (
      <Card className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 border-teal-200 dark:border-teal-800">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
          <span className="text-sm text-teal-700">Loading inspiration...</span>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 rounded-xl p-4 border border-teal-200 dark:border-teal-800"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-medium text-teal-800 dark:text-teal-200">Daily Inspiration</span>
          </div>
          <Button variant="ghost" size="icon" onClick={loadContent} className="h-7 w-7">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        
        {verse && (
          <>
            <p className="text-lg leading-relaxed mb-2 text-teal-900 dark:text-teal-100 text-right" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2' }}>
              {verse.arabic_text}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-1">{verse.translation}</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">{verse.surah_name} {verse.verse_number}</p>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-teal-950/40 dark:via-cyan-950/40 dark:to-emerald-950/40 border-teal-200 dark:border-teal-800 shadow-lg overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Daily Inspiration</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={loadContent} className="h-8 w-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white/60 dark:bg-slate-800/60 h-9 mb-4">
            <TabsTrigger value="verse" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              Verse
            </TabsTrigger>
            <TabsTrigger value="reflection" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Reflection
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verse" className="space-y-3">
            {verse && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={verse.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-xl leading-loose text-teal-900 dark:text-teal-100 mb-2 text-right" dir="rtl" lang="ar" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2.2' }}>
                      {verse.arabic_text}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {verse.translation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300">
                      {verse.surah_name} {verse.verse_number}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFavorite}
                      className={`h-7 w-7 ${verse.is_favorite ? 'text-rose-500' : 'text-slate-400'}`}
                    >
                      <Heart className={`w-4 h-4 ${verse.is_favorite ? 'fill-rose-500' : ''}`} />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="reflection" className="space-y-3">
            {reflection && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
                    {reflection.message}
                  </p>
                  
                  <div className="bg-teal-50 dark:bg-teal-900/40 rounded-lg p-3 border-l-4 border-teal-400 mb-2">
                    <p className="text-xs font-semibold text-teal-900 dark:text-teal-200 mb-1">💡 Key Insight</p>
                    <p className="text-xs text-teal-800 dark:text-teal-300">{reflection.key_insight}</p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/40 rounded-lg p-3 border-l-4 border-emerald-400">
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mb-1">✨ Today's Action</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">{reflection.action}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}