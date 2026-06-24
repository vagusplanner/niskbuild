import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, BookOpen, Search, Sparkles, Filter,
  RefreshCw, Share2, Copy
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'faith', label: 'Faith' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'charity', label: 'Charity' },
  { value: 'fasting', label: 'Fasting' },
  { value: 'hajj', label: 'Hajj' },
  { value: 'character', label: 'Character' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'family', label: 'Family' },
  { value: 'general', label: 'General' }
];

const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'Sahih Bukhari', label: 'Sahih Bukhari' },
  { value: 'Sahih Muslim', label: 'Sahih Muslim' },
  { value: 'Sunan Abu Dawood', label: 'Sunan Abu Dawood' },
  { value: 'Jami` at-Tirmidhi', label: "Jami` at-Tirmidhi" },
  { value: 'Sunan an-Nasa\'i', label: "Sunan an-Nasa'i" },
  { value: 'Sunan Ibn Majah', label: 'Sunan Ibn Majah' }
];

export default function EnhancedHadithBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const queryClient = useQueryClient();

  const { data: hadiths = [] } = useQuery({
    queryKey: ['hadiths'],
    queryFn: () => base44.entities.Hadith.list()
  });

  // Get daily hadith
  const { data: dailyHadith, refetch: refetchDaily } = useQuery({
    queryKey: ['daily-hadith'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const allHadiths = await base44.entities.Hadith.list();
      
      if (allHadiths.length === 0) return null;
      
      // Use date as seed for consistent daily selection
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
      return allHadiths[dayOfYear % allHadiths.length];
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (hadith) => {
      return base44.entities.Hadith.update(hadith.id, {
        is_favorite: !hadith.is_favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hadiths'] });
      toast.success('Favorite updated');
    }
  });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredHadiths = hadiths.filter(hadith => {
    const matchesSearch = searchQuery === '' || 
      hadith.english_translation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hadith.narrator?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || hadith.category === selectedCategory;
    const matchesSource = selectedSource === 'all' || hadith.source === selectedSource;
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  const favoriteHadiths = hadiths.filter(h => h.is_favorite);

  const HadithCard = ({ hadith, showCategory = true }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{hadith.source}</Badge>
              {showCategory && hadith.category && (
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
              onClick={() => toggleFavoriteMutation.mutate(hadith)}
            >
              <Heart className={`w-4 h-4 ${hadith.is_favorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hadith.arabic_text && (
          <div className="p-4 bg-teal-50 rounded-lg text-right" dir="rtl">
            <p className="text-lg leading-relaxed text-slate-800">{hadith.arabic_text}</p>
          </div>
        )}
        
        <div className="p-4 bg-slate-50 rounded-lg">
          <p className="text-slate-700 leading-relaxed">{hadith.english_translation}</p>
        </div>
        
        {hadith.reference && (
          <p className="text-xs text-slate-500">Reference: {hadith.reference}</p>
        )}
        
        {hadith.notes && (
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-900">{hadith.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Daily Hadith */}
      {dailyHadith && (
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                </div>
                <CardTitle>Hadith of the Day</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchDaily()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <HadithCard hadith={dailyHadith} showCategory={false} />
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search hadiths..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat.value}
                    variant={selectedCategory === cat.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Source</p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.slice(0, 4).map(source => (
                  <Button
                    key={source.value}
                    variant={selectedSource === source.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSource(source.value)}
                  >
                    {source.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hadith List */}
      <Tabs defaultValue="all">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">
            <BookOpen className="w-4 h-4 mr-1" />
            All ({filteredHadiths.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1">
            <Heart className="w-4 h-4 mr-1" />
            Favorites ({favoriteHadiths.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredHadiths.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-slate-500">
                No hadiths found. Try adjusting your search or filters.
              </CardContent>
            </Card>
          ) : (
            filteredHadiths.map(hadith => (
              <HadithCard key={hadith.id} hadith={hadith} />
            ))
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-3 mt-4">
          {favoriteHadiths.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Heart className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500">No favorite hadiths yet</p>
                <p className="text-sm text-slate-400">Tap the heart icon to save your favorites</p>
              </CardContent>
            </Card>
          ) : (
            favoriteHadiths.map(hadith => (
              <HadithCard key={hadith.id} hadith={hadith} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}