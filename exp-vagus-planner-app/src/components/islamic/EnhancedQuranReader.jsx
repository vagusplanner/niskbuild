import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  X, 
  Search, 
  Volume2, 
  Pause, 
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Languages,
  MessageCircle,
  Bookmark,
  Loader2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SURAHS, TRANSLATIONS, RECITERS } from './quranData';
import VerseDiscussionThread from './VerseDiscussionThread';

export default function EnhancedQuranReader({ initialSurah = 1, initialVerse = 1, onClose }) {
  const [currentSurah, setCurrentSurah] = useState(initialSurah);
  const [currentVerse, setCurrentVerse] = useState(initialVerse);
  const [verseData, setVerseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [contextData, setContextData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [showWordByWord, setShowWordByWord] = useState(false);
  const [wordByWordData, setWordByWordData] = useState(null);
  const [loadingWords, setLoadingWords] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState('sahih');
  const [selectedReciter, setSelectedReciter] = useState('alafasy');
  const [multipleTranslations, setMultipleTranslations] = useState([]);
  const [loadingMultipleTranslations, setLoadingMultipleTranslations] = useState(false);

  const surahInfo = SURAHS.find(s => s.number === currentSurah) || SURAHS[0];

  useEffect(() => {
    fetchVerse();
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [currentSurah, currentVerse]);

  const fetchVerse = async () => {
    setLoading(true);
    setMultipleTranslations([]);
    try {
      const translationName = TRANSLATIONS.find(t => t.id === selectedTranslation)?.name || 'Sahih International';
      
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `Provide the Quran verse ${currentSurah}:${currentVerse} (Surah ${surahInfo.name}) in the following format:

{
  "arabic_text": "The complete, accurate Arabic text of the verse with proper diacritics",
  "translation": "Clear ${translationName} English translation",
  "transliteration": "Accurate transliteration of the Arabic text"
}

CRITICAL: Use the exact ${translationName} translation for this verse. Ensure complete accuracy.`,
        response_json_schema: {
          type: "object",
          properties: {
            arabic_text: { type: "string" },
            translation: { type: "string" },
            transliteration: { type: "string" }
          }
        },
        add_context_from_internet: true
      });

      setVerseData(response);
    } catch (error) {
      toast.error('Failed to load verse');
    } finally {
      setLoading(false);
    }
  };

  const fetchContext = async () => {
    if (!verseData) return;
    
    setLoadingContext(true);
    try {
      const context = await SDK.integrations.Core.InvokeLLM({
        prompt: `Provide comprehensive tafsir (explanation) for Quran verse ${currentSurah}:${currentVerse} (Surah ${surahInfo.name}).

Arabic: ${verseData.arabic_text}
Translation: ${verseData.translation}

Structure your response with these sections:

📖 REVELATION CONTEXT
When and where was this verse revealed? What was the historical situation? (2-3 sentences)

🎯 KEY THEMES & LESSONS
Main teachings and principles from this verse (4-5 bullet points):
• Point 1
• Point 2
• etc.

🔗 RELATED VERSES
List 2-3 other Quran verses that relate to or expand on this theme (with brief explanation)

💫 PRACTICAL APPLICATION
How Muslims can apply these teachings in daily modern life (3-4 specific examples)

📚 SCHOLARLY COMMENTARY
Brief insights from classical tafsir scholars (Ibn Kathir, Al-Tabari, etc.) and modern scholars

Format clearly with headers and make it educational yet accessible.`,
        add_context_from_internet: true
      });

      setContextData(context);
      setShowContext(true);
    } catch (error) {
      toast.error('Failed to load context');
    } finally {
      setLoadingContext(false);
    }
  };

  const fetchWordByWord = async () => {
    if (!verseData) return;
    
    setLoadingWords(true);
    try {
      const words = await SDK.integrations.Core.InvokeLLM({
        prompt: `Break down the Arabic text word by word with translations for Quran verse ${currentSurah}:${currentVerse}.

Arabic text: ${verseData.arabic_text}

Provide as an array of objects with this structure:
{
  "words": [
    {
      "arabic": "word in Arabic",
      "transliteration": "transliteration",
      "translation": "English meaning",
      "root": "optional root word"
    }
  ]
}

Be accurate and educational.`,
        response_json_schema: {
          type: "object",
          properties: {
            words: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  arabic: { type: "string" },
                  transliteration: { type: "string" },
                  translation: { type: "string" },
                  root: { type: "string" }
                }
              }
            }
          }
        }
      });

      setWordByWordData(words);
      setShowWordByWord(true);
    } catch (error) {
      toast.error('Failed to load word-by-word analysis');
    } finally {
      setLoadingWords(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await SDK.integrations.Core.InvokeLLM({
        prompt: `Search the Holy Quran comprehensively for: "${searchQuery}"

SEARCH STRATEGY:
1. Direct keyword matches in verse text
2. Thematic and conceptual relevance
3. Related topics and teachings
4. Context-based matching (stories, guidance, laws, etc.)
5. Similar meanings even if different words used

Return up to 15 most relevant verses with this structure:
{
  "results": [
    {
      "surah": number (1-114),
      "surah_name": "Arabic name",
      "surah_english": "English name",
      "verse": verse number,
      "arabic": "Arabic text of the verse",
      "text": "English translation of the verse",
      "relevance": "why this verse matches the search (1-2 sentences)",
      "theme": "main theme (guidance/prayer/justice/patience/etc)",
      "keywords": ["key", "words"]
    }
  ]
}

IMPORTANT: Return authentic, accurate Quran verses only. Prioritize most relevant matches.`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  surah: { type: "number" },
                  surah_name: { type: "string" },
                  surah_english: { type: "string" },
                  verse: { type: "number" },
                  arabic: { type: "string" },
                  text: { type: "string" },
                  relevance: { type: "string" },
                  theme: { type: "string" },
                  keywords: { 
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        },
        add_context_from_internet: true
      });

      setSearchResults(results.results || []);
      if (results.results.length === 0) {
        toast.info('No results found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const playAudio = () => {
    const reciter = RECITERS.find(r => r.id === selectedReciter);
    const reciterCode = reciter?.code || 'ar.alafasy';
    
    // Verse-by-verse audio URL (Ayah-based recitation)
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/${reciterCode}/${currentSurah}${currentVerse.toString().padStart(3, '0')}.mp3`;
    
    if (audio) {
      audio.pause();
      setAudio(null);
      setIsPlaying(false);
    }
    
    const newAudio = new Audio(audioUrl);
    newAudio.play();
    setIsPlaying(true);
    setAudio(newAudio);
    
    newAudio.onended = () => {
      setIsPlaying(false);
    };

    newAudio.onerror = () => {
      toast.error('Audio playback failed - trying alternative source');
      setIsPlaying(false);
    };
  };

  const toggleAudio = () => {
    if (isPlaying) {
      audio?.pause();
      setIsPlaying(false);
    } else {
      playAudio();
    }
  };

  const navigateVerse = (direction) => {
    if (direction === 'next') {
      if (currentVerse < surahInfo.verses) {
        setCurrentVerse(currentVerse + 1);
      } else if (currentSurah < 114) {
        setCurrentSurah(currentSurah + 1);
        setCurrentVerse(1);
      }
    } else {
      if (currentVerse > 1) {
        setCurrentVerse(currentVerse - 1);
      } else if (currentSurah > 1) {
        const prevSurah = SURAHS.find(s => s.number === currentSurah - 1);
        setCurrentSurah(currentSurah - 1);
        setCurrentVerse(prevSurah?.verses || 1);
      }
    }
    setShowContext(false);
    setShowWordByWord(false);
    setMultipleTranslations([]);
  };

  const fetchMultipleTranslations = async () => {
    if (!verseData) return;
    
    setLoadingMultipleTranslations(true);
    try {
      const translations = await SDK.integrations.Core.InvokeLLM({
        prompt: `Provide multiple English translations for Quran verse ${currentSurah}:${currentVerse} (Surah ${surahInfo.name}).

Arabic text: ${verseData.arabic_text}

Provide these translations:
{
  "translations": [
    {
      "name": "Sahih International",
      "text": "translation text"
    },
    {
      "name": "Yusuf Ali",
      "text": "translation text"
    },
    {
      "name": "Pickthall",
      "text": "translation text"
    },
    {
      "name": "Dr. Mustafa Khattab",
      "text": "translation text"
    }
  ]
}

Provide accurate, verified translations from these well-known translators.`,
        response_json_schema: {
          type: "object",
          properties: {
            translations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  text: { type: "string" }
                }
              }
            }
          }
        },
        add_context_from_internet: true
      });

      setMultipleTranslations(translations.translations || []);
    } catch (error) {
      toast.error('Failed to load translations');
    } finally {
      setLoadingMultipleTranslations(false);
    }
  };

  const saveBookmark = async () => {
    try {
      await SDK.entities.QuranVerse.create({
        surah_number: currentSurah,
        surah_name: surahInfo.name,
        verse_number: currentVerse,
        arabic_text: verseData.arabic_text,
        translation: verseData.translation,
        transliteration: verseData.transliteration,
        date: new Date().toISOString().split('T')[0],
        is_favorite: true
      });
      toast.success('Bookmarked!');
    } catch (error) {
      toast.error('Failed to bookmark');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-teal-50 to-cyan-50">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-teal-600" />
              <div>
                <h2 className="font-bold text-lg text-teal-900">
                  {surahInfo.name} - {surahInfo.englishName}
                </h2>
                <p className="text-sm text-teal-600">
                  Surah {currentSurah}, Verse {currentVerse} • {surahInfo.revelation}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <Tabs defaultValue="reader" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="reader">Reader</TabsTrigger>
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="reader" className="flex-1 overflow-auto">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">
                  {/* Navigation & Settings */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Select
                        value={currentSurah.toString()}
                        onValueChange={(val) => {
                          setCurrentSurah(parseInt(val));
                          setCurrentVerse(1);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {SURAHS.map(surah => (
                            <SelectItem key={surah.number} value={surah.number.toString()}>
                              {surah.number}. {surah.name} - {surah.englishName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={currentVerse.toString()}
                        onValueChange={(val) => setCurrentVerse(parseInt(val))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {Array.from({ length: surahInfo.verses }, (_, i) => i + 1).map(v => (
                            <SelectItem key={v} value={v.toString()}>
                              Verse {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={selectedTranslation} onValueChange={(val) => {
                        setSelectedTranslation(val);
                        fetchVerse();
                      }}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSLATIONS.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={selectedReciter} onValueChange={setSelectedReciter}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECITERS.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                    </div>
                  ) : verseData ? (
                    <>
                      {/* Arabic Text */}
                      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                        <CardContent className="p-6">
                          <p className="text-right text-3xl leading-loose font-arabic text-teal-900" dir="rtl">
                            {verseData.arabic_text}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Transliteration */}
                      {verseData.transliteration && (
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-slate-600 italic text-center">
                            {verseData.transliteration}
                          </p>
                        </div>
                      )}

                      {/* Translation */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl">
                        <p className="text-slate-700 leading-relaxed text-lg">
                          {verseData.translation}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <Button
                          onClick={toggleAudio}
                          variant="outline"
                          className="border-teal-300"
                        >
                          {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                          {isPlaying ? 'Pause' : 'Listen'}
                        </Button>
                        <Button
                          onClick={fetchContext}
                          disabled={loadingContext}
                          variant="outline"
                          className="border-purple-300"
                        >
                          {loadingContext ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Tafsir
                        </Button>
                        <Button
                          onClick={fetchMultipleTranslations}
                          disabled={loadingMultipleTranslations}
                          variant="outline"
                          className="border-emerald-300"
                        >
                          {loadingMultipleTranslations ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Languages className="w-4 h-4 mr-2" />
                          )}
                          Compare
                        </Button>
                        <Button
                          onClick={fetchWordByWord}
                          disabled={loadingWords}
                          variant="outline"
                          className="border-blue-300"
                        >
                          {loadingWords ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Info className="w-4 h-4 mr-2" />
                          )}
                          Words
                        </Button>
                        <Button
                          onClick={saveBookmark}
                          variant="outline"
                          className="border-rose-300"
                        >
                          <Bookmark className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>

                      {/* Multiple Translations */}
                      {multipleTranslations.length > 0 && (
                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-emerald-900 text-base">
                              <Languages className="w-5 h-5" />
                              Translation Comparison
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {multipleTranslations.map((trans, idx) => (
                              <div key={idx} className="p-3 bg-white rounded-lg border border-emerald-200">
                                <div className="text-sm font-semibold text-emerald-700 mb-2">
                                  {trans.name}
                                </div>
                                <p className="text-slate-700 leading-relaxed">
                                  {trans.text}
                                </p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {/* Context Display */}
                      <AnimatePresence>
                        {showContext && contextData && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-purple-900">
                                  <MessageCircle className="w-5 h-5" />
                                  Tafsir - Verse Explanation
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="prose prose-sm max-w-none text-purple-900 whitespace-pre-line">
                                  {contextData}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Word by Word Display */}
                      <AnimatePresence>
                        {showWordByWord && wordByWordData && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-900">
                                  <Languages className="w-5 h-5" />
                                  Word-by-Word Analysis
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid gap-3">
                                  {wordByWordData.words?.map((word, idx) => (
                                    <div key={idx} className="p-3 bg-white rounded-lg border border-blue-200">
                                      <div className="flex items-start gap-4">
                                        <div className="text-2xl font-arabic text-blue-900">
                                          {word.arabic}
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm text-blue-600 italic mb-1">
                                            {word.transliteration}
                                          </div>
                                          <div className="text-sm font-medium text-blue-900">
                                            {word.translation}
                                          </div>
                                          {word.root && (
                                            <Badge className="mt-1 bg-blue-100 text-blue-700">
                                              Root: {word.root}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : null}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="discussion" className="flex-1 overflow-auto">
              <div className="p-6">
                {verseData && (
                  <VerseDiscussionThread
                    surahNumber={currentSurah}
                    verseNumber={currentVerse}
                    verseText={verseData.translation}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="flex-1 overflow-auto">
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by keyword, topic, or theme..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    {searchResults.map((result, idx) => (
                      <Card
                        key={idx}
                        className="cursor-pointer hover:shadow-md transition-shadow border-teal-200"
                        onClick={() => {
                          setCurrentSurah(result.surah);
                          setCurrentVerse(result.verse);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex gap-2 flex-wrap">
                              <Badge className="bg-teal-600">
                                {result.surah}:{result.verse}
                              </Badge>
                              {result.theme && (
                                <Badge variant="outline" className="text-teal-700 border-teal-300">
                                  {result.theme}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-teal-600">
                              {result.surah_name}
                              {result.surah_english && ` - ${result.surah_english}`}
                            </span>
                          </div>
                          
                          {result.arabic && (
                            <div className="p-3 bg-teal-50 rounded-lg mb-3">
                              <p className="text-right text-lg leading-relaxed font-arabic text-teal-900" dir="rtl">
                                {result.arabic}
                              </p>
                            </div>
                          )}
                          
                          <p className="text-slate-700 mb-2 leading-relaxed">{result.text}</p>
                          
                          {result.relevance && (
                            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded mb-2">
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="italic">{result.relevance}</span>
                            </div>
                          )}
                          
                          {result.keywords && result.keywords.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {result.keywords.map((kw, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between p-4 border-t bg-slate-50">
            <Button
              onClick={() => navigateVerse('prev')}
              disabled={currentSurah === 1 && currentVerse === 1}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <div className="text-sm text-slate-600">
              Verse {currentVerse} of {surahInfo.verses}
            </div>
            <Button
              onClick={() => navigateVerse('next')}
              disabled={currentSurah === 114 && currentVerse === surahInfo.verses}
              variant="outline"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}