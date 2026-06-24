import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, BookOpen, Sparkles, Volume2, Copy, Trash2, 
  Star, Moon, Sun, Coffee 
} from 'lucide-react';
import { toast } from 'sonner';

export default function SavedItemsBrowser() {
  const [playingAudio, setPlayingAudio] = useState(null);
  const queryClient = useQueryClient();

  // Fetch saved duas
  const { data: duas = [] } = useQuery({
    queryKey: ['favorite-duas'],
    queryFn: async () => {
      const all = await base44.entities.DailyDua.list();
      return all.filter(d => d.is_favorite);
    }
  });

  // Fetch saved hadiths
  const { data: hadiths = [] } = useQuery({
    queryKey: ['favorite-hadiths'],
    queryFn: async () => {
      const all = await base44.entities.Hadith.list();
      return all.filter(h => h.is_favorite);
    }
  });

  // Fetch saved Quran verses
  const { data: verses = [] } = useQuery({
    queryKey: ['favorite-verses'],
    queryFn: async () => {
      const all = await base44.entities.QuranReading.list();
      return all.filter(v => v.is_favorite);
    }
  });

  const removeFavoriteDuaMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyDua.update(id, { is_favorite: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-duas'] });
      queryClient.invalidateQueries({ queryKey: ['daily-duas'] });
      toast.success('Removed from favorites');
    }
  });

  const removeFavoriteHadithMutation = useMutation({
    mutationFn: (id) => base44.entities.Hadith.update(id, { is_favorite: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-hadiths'] });
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('Removed from favorites');
    }
  });

  const removeFavoriteVerseMutation = useMutation({
    mutationFn: (id) => base44.entities.QuranReading.update(id, { is_favorite: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-verses'] });
      queryClient.invalidateQueries({ queryKey: ['quran-verses'] });
      toast.success('Removed from favorites');
    }
  });

  const playAudio = (title) => {
    setPlayingAudio(title);
    toast.success('Playing audio...');
    setTimeout(() => setPlayingAudio(null), 3000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getOccasionIcon = (occasion) => {
    switch (occasion) {
      case 'morning': return Sun;
      case 'evening': case 'before_sleep': return Moon;
      case 'eating': return Coffee;
      default: return Star;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Saved Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="duas">
          <TabsList className="w-full">
            <TabsTrigger value="duas" className="flex-1">
              Du'as ({duas.length})
            </TabsTrigger>
            <TabsTrigger value="hadiths" className="flex-1">
              Hadith ({hadiths.length})
            </TabsTrigger>
            <TabsTrigger value="verses" className="flex-1">
              Quran ({verses.length})
            </TabsTrigger>
          </TabsList>

          {/* Saved Duas */}
          <TabsContent value="duas" className="space-y-4 mt-4">
            {duas.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">No saved du'as yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Save your favorites from the Islamic features
                </p>
              </div>
            ) : (
              duas.map(dua => {
                const Icon = getOccasionIcon(dua.occasion);
                return (
                  <Card key={dua.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="w-4 h-4 text-teal-600" />
                            {dua.title}
                          </CardTitle>
                          <Badge variant="outline" className="mt-2">
                            {dua.occasion}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => playAudio(dua.title)}
                          >
                            <Volume2 className={`w-4 h-4 ${playingAudio === dua.title ? 'text-teal-600' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(dua.english_translation)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFavoriteDuaMutation.mutate(dua.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dua.arabic_text && (
                        <div className="p-3 bg-teal-50 rounded-lg text-right" dir="rtl">
                          <p className="text-lg leading-relaxed text-slate-800">{dua.arabic_text}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-600">{dua.english_translation}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Saved Hadiths */}
          <TabsContent value="hadiths" className="space-y-4 mt-4">
            {hadiths.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">No saved hadiths yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Save your favorites from the Hadith browser
                </p>
              </div>
            ) : (
              hadiths.map(hadith => (
                <Card key={hadith.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{hadith.source}</Badge>
                          {hadith.category && (
                            <Badge className="bg-teal-100 text-teal-700">
                              {hadith.category}
                            </Badge>
                          )}
                        </div>
                        {hadith.narrator && (
                          <p className="text-sm text-slate-600">
                            Narrated by: <span className="font-medium">{hadith.narrator}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(hadith.english_translation)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFavoriteHadithMutation.mutate(hadith.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {hadith.arabic_text && (
                      <div className="p-3 bg-teal-50 rounded-lg text-right" dir="rtl">
                        <p className="text-lg leading-relaxed text-slate-800">{hadith.arabic_text}</p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{hadith.english_translation}</p>
                    </div>
                    {hadith.reference && (
                      <p className="text-xs text-slate-500">Reference: {hadith.reference}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Saved Quran Verses */}
          <TabsContent value="verses" className="space-y-4 mt-4">
            {verses.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">No saved verses yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Save your favorites from the Quran reader
                </p>
              </div>
            ) : (
              verses.map(verse => (
                <Card key={verse.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          Surah {verse.surah_number}, Verse {verse.verse_number}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{verse.surah_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(verse.translation || verse.arabic_text)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFavoriteVerseMutation.mutate(verse.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {verse.arabic_text && (
                      <div className="p-4 bg-teal-50 rounded-lg text-right" dir="rtl">
                        <p className="text-xl leading-loose text-slate-800">{verse.arabic_text}</p>
                      </div>
                    )}
                    {verse.translation && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700">{verse.translation}</p>
                      </div>
                    )}
                    {verse.notes && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-amber-900">{verse.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}