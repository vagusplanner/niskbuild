import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, 
  X, 
  Search, 
  Sparkles,
  MessageCircle,
  Bookmark,
  Loader2,
  Info,
  Heart,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const HADITH_COLLECTIONS = [
  { value: 'sahih_bukhari', label: 'Sahih Bukhari' },
  { value: 'sahih_muslim', label: 'Sahih Muslim' },
  { value: 'sunan_abu_dawood', label: 'Sunan Abu Dawood' },
  { value: 'jami_tirmidhi', label: "Jami' al-Tirmidhi" },
  { value: 'sunan_nasai', label: "Sunan an-Nasa'i" },
  { value: 'sunan_ibn_majah', label: 'Sunan Ibn Majah' },
  { value: 'musnad_ahmad', label: 'Musnad Ahmad' },
  { value: 'riyad_as_salihin', label: 'Riyad as Salihin (The Gardens of the Righteous)' },
  { value: 'hadith_qudsi', label: 'Hadith Qudsi' }
];

const HADITH_CATEGORIES = [
  'faith', 'prayer', 'charity', 'fasting', 'hajj', 
  'character', 'knowledge', 'family', 'general'
];

export default function EnhancedHadithReader({ onClose = () => {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedHadith, setSelectedHadith] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [relatedHadiths, setRelatedHadiths] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [filterCollection, setFilterCollection] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterNarrator, setFilterNarrator] = useState('');

  const queryClient = useQueryClient();

  // Fetch user's saved Hadiths
  const { data: savedHadiths = [] } = useQuery({
    queryKey: ['user-hadiths'],
    queryFn: () => SDK.entities.Hadith.list('-created_date', 50)
  });

  const saveHadithMutation = useMutation({
    mutationFn: (data) => SDK.entities.Hadith.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-hadiths']);
      toast.success('Hadith saved!');
    }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }
    
    setSearching(true);
    try {
      const results = await SDK.integrations.Core.InvokeLLM({
        prompt: `Search for authentic Hadiths based on: "${searchQuery}"

${filterCollection !== 'all' ? `COLLECTION FILTER: ${filterCollection}` : ''}
${filterCategory !== 'all' ? `CATEGORY FILTER: ${filterCategory}` : ''}
${filterNarrator ? `NARRATOR FILTER: ${filterNarrator}` : ''}

SEARCH STRATEGY:
1. Direct keyword matches in Hadith text
2. Thematic relevance and related concepts
3. Similar teachings or guidance
4. Context-based matching (life situations, moral guidance, etc.)

PRIORITY:
- Sahih (authentic) Hadiths first
- Most relevant to search query
- Clear, actionable guidance
- Diverse perspectives on the topic

Return up to 10 most relevant Hadiths with this structure:
{
  "results": [
    {
      "arabic_text": "Hadith in Arabic (if available, with proper diacritics)",
      "english_translation": "clear, accurate English translation",
      "narrator": "narrator name (e.g., Abu Hurairah, Aisha)",
      "source": "collection name (e.g., Sahih Bukhari, Sahih Muslim)",
      "reference": "book and hadith number (e.g., Book 2, Hadith 123)",
      "category": "category from: faith/prayer/charity/fasting/hajj/character/knowledge/family/general",
      "relevance": "why this hadith matches the search (1-2 sentences)",
      "grade": "authenticity grade (Sahih/Hasan/Daif)",
      "keywords": ["key", "words", "from", "hadith"]
    }
  ]
}

IMPORTANT: Only return Hadiths from authentic, recognized collections. Verify accuracy.`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                arabic_text: { type: "string" },
                english_translation: { type: "string" },
                narrator: { type: "string" },
                source: { type: "string" },
                reference: { type: "string" },
                category: { type: "string" },
                relevance: { type: "string" },
                grade: { type: "string" },
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
        toast.info('No Hadiths found matching your search');
      }
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const fetchExplanation = async (hadith) => {
    setLoadingExplanation(true);
    try {
      const exp = await SDK.integrations.Core.InvokeLLM({
        prompt: `Provide a comprehensive, structured explanation of this Hadith:

Hadith: ${hadith.english_translation}
Narrator: ${hadith.narrator}
Source: ${hadith.source} ${hadith.reference}

Structure your response with these clear sections:

📖 HISTORICAL CONTEXT
When and why was this Hadith narrated? What was the situation? (2-3 sentences)

💡 KEY TEACHINGS
List the main lessons and principles (4-5 bullet points):
• Point 1
• Point 2
• etc.

🌟 PRACTICAL APPLICATION
How can Muslims apply this in modern life? Provide specific, actionable guidance (3-4 sentences with examples)

📚 SCHOLARLY INSIGHTS
Brief commentary from classical and contemporary Islamic scholars, including any important nuances or interpretations

⚠️ COMMON MISUNDERSTANDINGS
If applicable, address any common misconceptions about this Hadith

Format with clear section headers and make it educational yet accessible.`,
        add_context_from_internet: true
      });

      setExplanation(exp);
      setShowExplanation(true);
    } catch (error) {
      toast.error('Failed to load explanation');
    } finally {
      setLoadingExplanation(false);
    }
  };

  const fetchRelatedHadiths = async (hadith) => {
    setLoadingRelated(true);
    try {
      const related = await SDK.integrations.Core.InvokeLLM({
        prompt: `Find 3-5 related Hadiths that complement or expand on this theme:

Hadith: ${hadith.english_translation}
Category: ${hadith.category}

Find Hadiths with:
- Similar themes or teachings
- Complementary guidance
- Additional context

Return as:
{
  "hadiths": [
    {
      "english_translation": "translation",
      "narrator": "narrator",
      "source": "source",
      "reference": "reference",
      "connection": "how it relates to the main hadith"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            hadiths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  english_translation: { type: "string" },
                  narrator: { type: "string" },
                  source: { type: "string" },
                  reference: { type: "string" },
                  connection: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRelatedHadiths(related.hadiths || []);
    } catch (error) {
      toast.error('Failed to load related Hadiths');
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleSelectHadith = (hadith) => {
    setSelectedHadith(hadith);
    setShowExplanation(false);
    setExplanation(null);
    setRelatedHadiths([]);
  };

  const handleSaveHadith = (hadith) => {
    saveHadithMutation.mutate({
      arabic_text: hadith.arabic_text || '',
      english_translation: hadith.english_translation,
      narrator: hadith.narrator,
      source: hadith.source,
      reference: hadith.reference,
      category: hadith.category || 'general',
      is_favorite: true
    });
  };

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <BookOpen className="w-5 h-5" />
          Hadith Reader
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="space-y-4">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="saved">Saved ({savedHadiths.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
                  {/* Search Section */}
                  <Card className="border-amber-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search by keyword, topic, or theme..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                          className="flex-1"
                        />
                        <Button onClick={handleSearch} disabled={searching}>
                          {searching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={filterCollection} onValueChange={setFilterCollection}>
                          <SelectTrigger>
                            <SelectValue placeholder="Collection" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Collections</SelectItem>
                            {HADITH_COLLECTIONS.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {HADITH_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Narrator..."
                          value={filterNarrator}
                          onChange={(e) => setFilterNarrator(e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="grid lg:grid-cols-2 gap-4">
                      {/* Results List */}
                      <div className="space-y-3">
                        {searchResults.map((hadith, idx) => (
                          <Card
                            key={idx}
                            className={`cursor-pointer transition-all ${
                              selectedHadith === hadith
                                ? 'border-amber-500 shadow-lg'
                                : 'border-amber-200 hover:shadow-md'
                            }`}
                            onClick={() => handleSelectHadith(hadith)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex flex-wrap gap-2">
                                  <Badge className="bg-amber-600">{hadith.grade}</Badge>
                                  <Badge variant="outline">{hadith.category}</Badge>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveHadith(hadith);
                                  }}
                                >
                                  <Bookmark className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm text-slate-700 line-clamp-3 mb-2">
                                {hadith.english_translation}
                              </p>
                              {hadith.relevance && (
                                <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded mb-2 italic">
                                  <Sparkles className="w-3 h-3 inline mr-1" />
                                  {hadith.relevance}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <span>{hadith.narrator}</span>
                                  <span>•</span>
                                  <span>{hadith.source}</span>
                                </div>
                                {hadith.keywords && hadith.keywords.length > 0 && (
                                  <div className="flex gap-1">
                                    {hadith.keywords.slice(0, 2).map((kw, i) => (
                                      <span key={i} className="text-xs px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Detail View */}
                      {selectedHadith && (
                        <div className="space-y-4">
                          <Card className="border-amber-200 sticky top-0">
                            <CardContent className="p-6 space-y-4">
                              {selectedHadith.arabic_text && (
                                <div className="p-4 bg-amber-50 rounded-xl">
                                  <p className="text-right text-xl leading-relaxed font-arabic text-amber-900" dir="rtl">
                                    {selectedHadith.arabic_text}
                                  </p>
                                </div>
                              )}

                              <div className="p-4 bg-white border border-amber-200 rounded-xl">
                                <p className="text-slate-700 leading-relaxed">
                                  {selectedHadith.english_translation}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {selectedHadith.source}
                                </div>
                                <span>•</span>
                                <span>{selectedHadith.reference}</span>
                                <span>•</span>
                                <span>Narrated by {selectedHadith.narrator}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  onClick={() => fetchExplanation(selectedHadith)}
                                  disabled={loadingExplanation}
                                  variant="outline"
                                  className="border-purple-300"
                                >
                                  {loadingExplanation ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-4 h-4 mr-2" />
                                  )}
                                  Explain
                                </Button>
                                <Button
                                  onClick={() => fetchRelatedHadiths(selectedHadith)}
                                  disabled={loadingRelated}
                                  variant="outline"
                                  className="border-blue-300"
                                >
                                  {loadingRelated ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Link2 className="w-4 h-4 mr-2" />
                                  )}
                                  Related
                                </Button>
                              </div>

                              {/* Explanation */}
                              <AnimatePresence>
                                {showExplanation && explanation && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                  >
                                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                                      <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-purple-900 text-base">
                                          <MessageCircle className="w-4 h-4" />
                                          Explanation & Context
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                       <div className="prose prose-sm max-w-none text-purple-900 whitespace-pre-line">
                                         {explanation}
                                       </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Related Hadiths */}
                              {relatedHadiths.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                    <Link2 className="w-4 h-4" />
                                    Related Hadiths
                                  </h4>
                                  {relatedHadiths.map((rel, idx) => (
                                    <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <p className="text-sm text-blue-900 mb-2">{rel.english_translation}</p>
                                      <div className="text-xs text-blue-600 mb-1">
                                        {rel.narrator} • {rel.source} {rel.reference}
                                      </div>
                                      <div className="text-xs text-blue-700 italic">
                                        <Info className="w-3 h-3 inline mr-1" />
                                        {rel.connection}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-3">
                  {savedHadiths.map((hadith) => (
                    <Card key={hadith.id} className="border-amber-200">
                      <CardContent className="p-4">
                        {hadith.arabic_text && (
                          <div className="p-3 bg-amber-50 rounded-lg mb-3">
                            <p className="text-right text-lg leading-relaxed font-arabic text-amber-900" dir="rtl">
                              {hadith.arabic_text}
                            </p>
                          </div>
                        )}
                        <p className="text-slate-700 leading-relaxed mb-3">
                          {hadith.english_translation}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-slate-600">
                            {hadith.narrator} • {hadith.source}
                          </div>
                          <div className="flex gap-2">
                            <Badge>{hadith.category}</Badge>
                            {hadith.is_favorite && (
                              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                            )}
                          </div>
                        </div>
                        {hadith.notes && (
                          <div className="mt-3 pt-3 border-t text-sm text-slate-600">
                            <strong>Notes:</strong> {hadith.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {savedHadiths.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <Bookmark className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>No saved Hadiths yet. Search and save to build your collection!</p>
                    </div>
                  )}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  );
}