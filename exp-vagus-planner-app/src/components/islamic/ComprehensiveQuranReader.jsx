import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { SDK } from '@/lib/custom-sdk.js';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, BookOpen, 
  Heart, Share2, Bookmark, Search, Book, MessageCircle, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SURAHS = [
  { number: 1, name: 'Al-Fatihah', verses: 7, meaning: 'The Opening' },
  { number: 2, name: 'Al-Baqarah', verses: 286, meaning: 'The Cow' },
  { number: 3, name: 'Ali-Imran', verses: 200, meaning: 'Family of Imran' },
  { number: 4, name: 'An-Nisa', verses: 176, meaning: 'The Women' },
  { number: 36, name: 'Ya-Sin', verses: 83, meaning: 'Ya-Sin' },
  { number: 67, name: 'Al-Mulk', verses: 30, meaning: 'The Sovereignty' },
  { number: 112, name: 'Al-Ikhlas', verses: 4, meaning: 'The Sincerity' },
  { number: 113, name: 'Al-Falaq', verses: 5, meaning: 'The Daybreak' },
  { number: 114, name: 'An-Nas', verses: 6, meaning: 'Mankind' }
];

const TRANSLATIONS = [
  { id: 'tafsir-tabari', name: 'Tafsīr al-Ṭabarī', language: 'Tafsir' },
  { id: 'tafsir-ibni-kathir', name: 'Tafsīr Ibn Kathīr', language: 'Tafsir' },
  { id: 'tafsir-qurtubbi', name: 'Tafsir al-Qurṭubī', language: 'Tafsir' },
  { id: 'tafsir-jalalayn', name: 'Tafsir al-Jalālayn', language: 'Tafsir' }
];

const RECITERS = [
  { id: 'mishary', name: 'Mishary Rashid Alafasy' },
  { id: 'sudais', name: 'Abdul Rahman Al-Sudais' },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary' }
];

export default function ComprehensiveQuranReader() {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [verseRange, setVerseRange] = useState({ start: 1, end: 7 });
  const [translation, setTranslation] = useState('tafsir-jalalayn');
  const [reciter, setReciter] = useState('mishary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(1);
  const [volume, setVolume] = useState(75);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const audioRef = useRef(null);

  const surah = SURAHS.find(s => s.number === selectedSurah);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        toast.info('Audio recitation requires an internet connection to a Quran audio source.');
        return;
      }
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          toast.error('Could not play audio. Please try again.');
        }
      });
    }
  };

  const nextVerse = () => {
    if (currentVerse < verseRange.end) {
      setCurrentVerse(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const prevVerse = () => {
    if (currentVerse > verseRange.start) {
      setCurrentVerse(prev => prev - 1);
    }
  };

  const addBookmark = async () => {
    try {
      await SDK.entities.QuranVerse.create({
        surah_number: selectedSurah,
        surah_name: surah?.name,
        verse_number: currentVerse,
        is_favorite: true,
        notes: ''
      });
      toast.success('Verse bookmarked!');
      setBookmarks(prev => [...prev, { surah: selectedSurah, verse: currentVerse }]);
    } catch (error) {
      toast.error('Failed to bookmark');
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
            <BookOpen className="w-5 h-5" />
            Quran Reader
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Surah Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Select Surah
              </label>
              <Select value={selectedSurah.toString()} onValueChange={(v) => setSelectedSurah(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {SURAHS.map((surah) => (
                    <SelectItem key={surah.number} value={surah.number.toString()}>
                      {surah.number}. {surah.name} ({surah.meaning}) - {surah.verses} verses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Translation
              </label>
              <Select value={translation} onValueChange={setTranslation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATIONS.map((trans) => (
                    <SelectItem key={trans.id} value={trans.id}>
                      {trans.name} ({trans.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search verses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Surah Info */}
          {surah && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {surah.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {surah.meaning} • {surah.verses} verses
                  </p>
                </div>
                <Badge variant="outline" className="text-emerald-600">
                  Verse {currentVerse}
                </Badge>
              </div>

              {/* Arabic Text - Mock */}
              <div className="text-right mb-4">
                <p className="text-2xl leading-loose text-slate-800 dark:text-slate-200 font-arabic">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>

              {/* Translation - Mock */}
              <div className="text-left mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  In the name of Allah, the Entirely Merciful, the Especially Merciful.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={addBookmark}>
                  <Bookmark className="w-4 h-4 mr-1" />
                  Bookmark
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Notes
                </Button>
              </div>
            </motion.div>
          )}

          {/* Tabs for Tafsir and Related */}
          <Tabs defaultValue="tafsir" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tafsir" className="text-xs">
                <Lightbulb className="w-3 h-3 mr-1" />
                Tafsir
              </TabsTrigger>
              <TabsTrigger value="related" className="text-xs">
                <Book className="w-3 h-3 mr-1" />
                Related
              </TabsTrigger>
              <TabsTrigger value="bookmarks" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tafsir" className="space-y-3">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Tafsir (Explanation)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    This surah emphasizes the importance of seeking guidance from Allah and 
                    the straight path. It highlights Allah's mercy and serves as the foundation 
                    of every prayer.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="related" className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Related verses and context will appear here.
              </p>
            </TabsContent>

            <TabsContent value="bookmarks" className="space-y-2">
              {bookmarks.length > 0 ? (
                bookmarks.map((bookmark, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <p className="text-sm">
                        Surah {bookmark.surah}, Verse {bookmark.verse}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
                  No bookmarks yet. Tap the bookmark button to save verses.
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Audio Controls */}
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-emerald-100 text-xs">Reciter</p>
                  <Select value={reciter} onValueChange={setReciter}>
                    <SelectTrigger className="bg-white/20 border-white/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECITERS.map((rec) => (
                        <SelectItem key={rec.id} value={rec.id}>
                          {rec.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  <Slider
                    value={[volume]}
                    onValueChange={([v]) => setVolume(v)}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevVerse}
                  className="text-white hover:bg-white/20"
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayPause}
                  className="text-white hover:bg-white/20 w-14 h-14"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7" />
                  ) : (
                    <Play className="w-7 h-7" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextVerse}
                  className="text-white hover:bg-white/20"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              <audio ref={audioRef} onEnded={nextVerse} />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}