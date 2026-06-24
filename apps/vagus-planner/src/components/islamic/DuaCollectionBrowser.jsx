import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, Volume2, Search, BookOpen, Star, 
  Sun, Moon, Coffee, Plane, Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

const OCCASIONS = [
  { value: 'morning', label: 'Morning', icon: Sun },
  { value: 'evening', label: 'Evening', icon: Moon },
  { value: 'before_sleep', label: 'Before Sleep', icon: Moon },
  { value: 'after_prayer', label: 'After Prayer', icon: Star },
  { value: 'eating', label: 'Eating', icon: Coffee },
  { value: 'traveling', label: 'Traveling', icon: Plane },
  { value: 'difficulty', label: 'In Difficulty', icon: Sparkles },
  { value: 'gratitude', label: 'Gratitude', icon: Heart },
  { value: 'general', label: 'General', icon: BookOpen }
];

export default function DuaCollectionBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('all');
  const [playingAudio, setPlayingAudio] = useState(null);
  const queryClient = useQueryClient();

  const { data: duas = [] } = useQuery({
    queryKey: ['daily-duas'],
    queryFn: () => base44.entities.DailyDua.list()
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (dua) => {
      return base44.entities.DailyDua.update(dua.id, {
        is_favorite: !dua.is_favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-duas'] });
    }
  });

  const playAudio = (duaTitle) => {
    // Simulate audio playback (in a real app, you'd use actual audio files)
    setPlayingAudio(duaTitle);
    toast.success('Playing audio recitation...');
    setTimeout(() => setPlayingAudio(null), 3000);
  };

  const filteredDuas = duas.filter(dua => {
    const matchesSearch = searchQuery === '' || 
      dua.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dua.english_translation?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesOccasion = selectedOccasion === 'all' || dua.occasion === selectedOccasion;
    
    return matchesSearch && matchesOccasion;
  });

  const favoriteDuas = duas.filter(d => d.is_favorite);

  return (
    <div className="space-y-4">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search duas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Occasion Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedOccasion === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedOccasion('all')}
        >
          All
        </Button>
        {OCCASIONS.map(occasion => {
          const Icon = occasion.icon;
          return (
            <Button
              key={occasion.value}
              variant={selectedOccasion === occasion.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedOccasion(occasion.value)}
              className="gap-2"
            >
              <Icon className="w-3 h-3" />
              {occasion.label}
            </Button>
          );
        })}
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            All Duas ({filteredDuas.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1">
            <Heart className="w-4 h-4 mr-1" />
            Favorites ({favoriteDuas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredDuas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                No duas found. Try adjusting your search or filters.
              </CardContent>
            </Card>
          ) : (
            filteredDuas.map(dua => (
              <Card key={dua.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{dua.title}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {OCCASIONS.find(o => o.value === dua.occasion)?.label || dua.occasion}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => playAudio(dua.title)}
                        disabled={playingAudio === dua.title}
                      >
                        <Volume2 className={`w-4 h-4 ${playingAudio === dua.title ? 'text-teal-600' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavoriteMutation.mutate(dua)}
                      >
                        <Heart className={`w-4 h-4 ${dua.is_favorite ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dua.arabic_text && (
                    <div className="p-4 bg-teal-50 rounded-lg text-right" dir="rtl">
                      <p className="text-xl leading-loose text-slate-800 font-arabic">
                        {dua.arabic_text}
                      </p>
                    </div>
                  )}
                  
                  {dua.transliteration && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600 italic">{dua.transliteration}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Translation:</p>
                    <p className="text-slate-600">{dua.english_translation}</p>
                  </div>
                  
                  {dua.benefits && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-xs font-medium text-amber-900 mb-1">Benefits:</p>
                      <p className="text-xs text-amber-800">{dua.benefits}</p>
                    </div>
                  )}
                  
                  {dua.reference && (
                    <p className="text-xs text-slate-500">Reference: {dua.reference}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-3 mt-4">
          {favoriteDuas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Heart className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500">No favorite duas yet</p>
                <p className="text-sm text-slate-400">Tap the heart icon to save your favorites</p>
              </CardContent>
            </Card>
          ) : (
            favoriteDuas.map(dua => (
              <Card key={dua.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{dua.title}</CardTitle>
                      <Badge variant="outline" className="mt-2">
                        {OCCASIONS.find(o => o.value === dua.occasion)?.label || dua.occasion}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => playAudio(dua.title)}
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavoriteMutation.mutate(dua)}
                      >
                        <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dua.arabic_text && (
                    <div className="p-4 bg-teal-50 rounded-lg text-right" dir="rtl">
                      <p className="text-xl leading-loose text-slate-800">{dua.arabic_text}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Translation:</p>
                    <p className="text-slate-600">{dua.english_translation}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}