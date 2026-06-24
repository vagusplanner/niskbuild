import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Search, BookOpen, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { HADITH_DB } from './QURAN_DATA';

const CATEGORY_COLORS = {
  faith: 'bg-purple-100 text-purple-700',
  prayer: 'bg-teal-100 text-teal-700',
  charity: 'bg-green-100 text-green-700',
  fasting: 'bg-amber-100 text-amber-700',
  hajj: 'bg-orange-100 text-orange-700',
  character: 'bg-blue-100 text-blue-700',
  knowledge: 'bg-indigo-100 text-indigo-700',
  family: 'bg-pink-100 text-pink-700',
  general: 'bg-slate-100 text-slate-600'
};

export default function HadithBrowser() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedHadiths = [] } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => base44.entities.Hadith.list('-created_date')
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => base44.entities.Hadith.update(id, { is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hadiths'] })
  });

  const saveMutation = useMutation({
    mutationFn: (hadith) => base44.entities.Hadith.create({
      arabic_text: hadith.arabic,
      english_translation: hadith.english,
      narrator: hadith.narrator,
      source: hadith.source,
      reference: hadith.reference,
      category: hadith.category,
      is_favorite: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('Hadith saved to favorites!');
    }
  });

  // Merge local DB + user saved, deduplicate by english text snippet
  const allHadiths = useMemo(() => {
    const savedTexts = new Set(savedHadiths.map(h => h.english_translation?.slice(0, 40)));
    const localEntries = HADITH_DB
      .filter(h => !savedTexts.has(h.english?.slice(0, 40)))
      .map(h => ({
        id: `local_${h.id}`, arabic_text: h.arabic, english_translation: h.english,
        narrator: h.narrator, source: h.source, reference: h.reference,
        category: h.category, is_favorite: false, _local: true, _localData: h
      }));
    return [...savedHadiths, ...localEntries];
  }, [savedHadiths]);

  const filtered = useMemo(() => {
    return allHadiths.filter(h => {
      const matchCat = filterCat === 'all' || h.category === filterCat;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        h.english_translation?.toLowerCase().includes(q) ||
        h.narrator?.toLowerCase().includes(q) ||
        h.source?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allHadiths, search, filterCat]);

  const generateHadith = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an authentic hadith with the following JSON structure. Choose a well-known, authentic hadith not already in this list: ${HADITH_DB.map(h => h.english.slice(0, 30)).join(' | ')}

Return ONLY valid JSON:
{
  "arabic": "Arabic text of hadith",
  "english": "English translation",
  "narrator": "Companion who narrated it (RA)",
  "source": "Collection name (e.g. Sahih Bukhari)",
  "reference": "Book and hadith number",
  "category": "one of: faith|prayer|charity|fasting|hajj|character|knowledge|family|general"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            arabic: { type: "string" },
            english: { type: "string" },
            narrator: { type: "string" },
            source: { type: "string" },
            reference: { type: "string" },
            category: { type: "string" }
          }
        }
      });
      await base44.entities.Hadith.create({
        arabic_text: result.arabic,
        english_translation: result.english,
        narrator: result.narrator,
        source: result.source,
        reference: result.reference,
        category: result.category,
        is_favorite: false
      });
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('New hadith added!');
    } catch (e) {
      toast.error('Could not generate hadith');
    } finally {
      setGenerating(false);
    }
  };

  const toggleFavorite = (hadith) => {
    if (hadith._local) {
      saveMutation.mutate(hadith._localData);
    } else {
      favoriteMutation.mutate({ id: hadith.id, is_favorite: !hadith.is_favorite });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search hadiths..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.keys(CATEGORY_COLORS).map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={generateHadith} disabled={generating} className="gap-1 whitespace-nowrap">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          AI Hadith
        </Button>
      </div>

      <p className="text-xs text-slate-400">{filtered.length} hadiths{search ? ` matching "${search}"` : ''}</p>

      {/* Hadith List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(hadith => (
            <motion.div
              key={hadith.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={cn(
                "overflow-hidden transition-all cursor-pointer hover:shadow-md",
                hadith.is_favorite && "border-amber-300 bg-amber-50/30"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-xs", CATEGORY_COLORS[hadith.category])}>{hadith.category}</Badge>
                      <span className="text-xs text-slate-400">{hadith.source} · {hadith.reference}</span>
                    </div>
                    <button onClick={() => toggleFavorite(hadith)} className="flex-shrink-0 p-1 rounded-lg hover:bg-white/80 transition-colors">
                      <Heart className={cn("w-4 h-4", hadith.is_favorite ? "fill-rose-500 text-rose-500" : "text-slate-300")} />
                    </button>
                  </div>

                  {/* Arabic */}
                  <p className="text-right text-lg leading-relaxed text-slate-800 mb-3 font-arabic" dir="rtl">
                    {hadith.arabic_text}
                  </p>

                  {/* English */}
                  <p className={cn(
                    "text-sm text-slate-700 leading-relaxed",
                    expanded !== hadith.id && "line-clamp-3"
                  )}>
                    "{hadith.english_translation}"
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500 italic">— {hadith.narrator}</span>
                    <button
                      onClick={() => setExpanded(expanded === hadith.id ? null : hadith.id)}
                      className="text-xs text-teal-600 hover:text-teal-800"
                    >
                      {expanded === hadith.id ? 'Show less' : 'Read more'}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}