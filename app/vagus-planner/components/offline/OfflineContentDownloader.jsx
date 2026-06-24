import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { offlineStorage } from './offlineStorage';
import { Download, BookOpen, CheckCircle2, Loader2, Book } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const ALL_SURAHS = [
  { number: 1, name: 'Al-Fatihah', verses: 7 },
  { number: 2, name: 'Al-Baqarah', verses: 286 },
  { number: 3, name: 'Aal-e-Imran', verses: 200 },
  { number: 18, name: 'Al-Kahf', verses: 110 },
  { number: 36, name: 'Ya-Sin', verses: 83 },
  { number: 55, name: 'Ar-Rahman', verses: 78 },
  { number: 67, name: 'Al-Mulk', verses: 30 },
  { number: 112, name: 'Al-Ikhlas', verses: 4 },
  { number: 113, name: 'Al-Falaq', verses: 5 },
  { number: 114, name: 'An-Nas', verses: 6 }
];

const HADITH_COLLECTIONS = [
  { id: 'bukhari', name: 'Sahih Bukhari', count: 40 },
  { id: 'muslim', name: 'Sahih Muslim', count: 40 },
  { id: 'tirmidhi', name: 'Jami At-Tirmidhi', count: 40 },
  { id: 'abudawud', name: 'Sunan Abu Dawud', count: 40 }
];

export default function OfflineContentDownloader() {
  const [downloadedSurahs, setDownloadedSurahs] = useState([]);
  const [downloadedCollections, setDownloadedCollections] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadDownloadedContent();
  }, []);

  const loadDownloadedContent = async () => {
    try {
      await offlineStorage.init();
      const [allVerses, allHadith] = await Promise.all([
        offlineStorage.getAll('quranVerses'),
        offlineStorage.getAll('hadith')
      ]);
      
      const surahs = [...new Set(allVerses.map(v => v.surah_number))];
      const collections = [...new Set(allHadith.map(h => h.collection))];
      
      setDownloadedSurahs(surahs);
      setDownloadedCollections(collections);
    } catch (error) {
      console.error('Failed to load downloaded content:', error);
    }
  };

  const downloadSurah = async (surah) => {
    setDownloading(`surah-${surah.number}`);
    setDownloadProgress(0);
    
    try {
      // Download in chunks to show progress
      const chunkSize = 10;
      const totalChunks = Math.ceil(surah.verses / chunkSize);
      
      for (let i = 0; i < totalChunks; i++) {
        const startVerse = i * chunkSize + 1;
        const endVerse = Math.min((i + 1) * chunkSize, surah.verses);
        
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate verses ${startVerse} to ${endVerse} of Surah ${surah.name} (Surah ${surah.number}). For each verse provide:
          - verse_number
          - arabic_text (authentic Quranic Arabic)
          - translation (English)
          - transliteration (Roman)
          
          Return as an array of verse objects.`,
          response_json_schema: {
            type: 'object',
            properties: {
              verses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    verse_number: { type: 'number' },
                    arabic_text: { type: 'string' },
                    translation: { type: 'string' },
                    transliteration: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        const verses = response.verses.map(v => ({
          id: `${surah.number}-${v.verse_number}`,
          surah_number: surah.number,
          surah_name: surah.name,
          verse_number: v.verse_number,
          arabic_text: v.arabic_text,
          translation: v.translation,
          transliteration: v.transliteration
        }));

        await offlineStorage.cacheQuranVerses(verses);
        setDownloadProgress(((i + 1) / totalChunks) * 100);
      }

      await loadDownloadedContent();
      toast.success(`Surah ${surah.name} downloaded`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download Surah');
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const downloadHadithCollection = async (collection) => {
    setDownloading(`hadith-${collection.id}`);
    setDownloadProgress(0);
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate ${collection.count} authentic Hadith from ${collection.name}. For each Hadith provide:
        - hadith_number (1 to ${collection.count})
        - arabic_text (authentic Arabic text)
        - english_translation (clear English translation)
        - narrator (chain of narration)
        - reference (book and chapter reference)
        - theme (brief category like 'Faith', 'Prayer', 'Charity', etc.)
        
        Return as an array of hadith objects.`,
        response_json_schema: {
          type: 'object',
          properties: {
            hadiths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hadith_number: { type: 'number' },
                  arabic_text: { type: 'string' },
                  english_translation: { type: 'string' },
                  narrator: { type: 'string' },
                  reference: { type: 'string' },
                  theme: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const hadiths = response.hadiths.map(h => ({
        id: `${collection.id}-${h.hadith_number}`,
        collection: collection.id,
        collection_name: collection.name,
        hadith_number: h.hadith_number,
        arabic_text: h.arabic_text,
        english_translation: h.english_translation,
        narrator: h.narrator,
        reference: h.reference,
        theme: h.theme
      }));

      await offlineStorage.cacheHadithCollection(collection.id, hadiths);
      setDownloadProgress(100);
      
      await loadDownloadedContent();
      toast.success(`${collection.name} downloaded`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download collection');
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-teal-600" />
          Download for Offline Access
        </CardTitle>
        <CardDescription>
          Download Quran Surahs and Hadith collections to access them offline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quran">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quran">
              <BookOpen className="w-4 h-4 mr-2" />
              Quran Surahs
            </TabsTrigger>
            <TabsTrigger value="hadith">
              <Book className="w-4 h-4 mr-2" />
              Hadith Collections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quran" className="space-y-3 mt-4">
            {ALL_SURAHS.map(surah => {
              const isDownloaded = downloadedSurahs.includes(surah.number);
              const isDownloading = downloading === `surah-${surah.number}`;

              return (
                <div
                  key={surah.number}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">
                      {surah.number}. {surah.name}
                    </p>
                    <p className="text-xs text-slate-500">{surah.verses} verses</p>
                    {isDownloading && (
                      <Progress value={downloadProgress} className="h-1 mt-2" />
                    )}
                  </div>

                  {isDownloaded ? (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Downloaded
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => downloadSurah(surah)}
                      disabled={isDownloading}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {Math.round(downloadProgress)}%
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}

            {downloadedSurahs.length > 0 && (
              <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm text-teal-800">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {downloadedSurahs.length} Surah{downloadedSurahs.length !== 1 ? 's' : ''} available offline
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="hadith" className="space-y-3 mt-4">
            {HADITH_COLLECTIONS.map(collection => {
              const isDownloaded = downloadedCollections.includes(collection.id);
              const isDownloading = downloading === `hadith-${collection.id}`;

              return (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{collection.name}</p>
                    <p className="text-xs text-slate-500">{collection.count} hadiths</p>
                    {isDownloading && (
                      <Progress value={downloadProgress} className="h-1 mt-2" />
                    )}
                  </div>

                  {isDownloaded ? (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Downloaded
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => downloadHadithCollection(collection)}
                      disabled={isDownloading}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}

            {downloadedCollections.length > 0 && (
              <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm text-teal-800">
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  {downloadedCollections.length} collection{downloadedCollections.length !== 1 ? 's' : ''} available offline
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}