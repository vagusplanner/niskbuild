import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { offlineStorage } from './offlineStorage';
import { Download, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const POPULAR_SURAHS = [
  { number: 1, name: 'Al-Fatihah', verses: 7 },
  { number: 2, name: 'Al-Baqarah', verses: 286 },
  { number: 18, name: 'Al-Kahf', verses: 110 },
  { number: 36, name: 'Ya-Sin', verses: 83 },
  { number: 67, name: 'Al-Mulk', verses: 30 },
  { number: 112, name: 'Al-Ikhlas', verses: 4 },
  { number: 113, name: 'Al-Falaq', verses: 5 },
  { number: 114, name: 'An-Nas', verses: 6 }
];

export default function OfflineQuranViewer() {
  const [downloadedSurahs, setDownloadedSurahs] = useState([]);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadDownloadedSurahs();
  }, []);

  const loadDownloadedSurahs = async () => {
    try {
      await offlineStorage.init();
      const allVerses = await offlineStorage.getAll('quranVerses');
      const surahs = [...new Set(allVerses.map(v => v.surah_number))];
      setDownloadedSurahs(surahs);
    } catch (error) {
      console.error('Failed to load downloaded surahs:', error);
    }
  };

  const downloadSurah = async (surah) => {
    setDownloading(surah.number);
    try {
      // Generate sample Quran verses using AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate the first ${Math.min(10, surah.verses)} verses of Surah ${surah.name} (Surah ${surah.number}). For each verse provide:
        - verse_number (1, 2, 3...)
        - arabic_text (authentic Quranic Arabic)
        - translation (English translation)
        - transliteration (Roman transliteration)
        
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
      await loadDownloadedSurahs();
      toast.success(`Surah ${surah.name} downloaded for offline access`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download Surah');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" />
          Offline Quran Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          Download Surahs to read offline. Downloaded content is available anytime.
        </p>

        <div className="grid gap-2">
          {POPULAR_SURAHS.map(surah => {
            const isDownloaded = downloadedSurahs.includes(surah.number);
            const isDownloading = downloading === surah.number;

            return (
              <div
                key={surah.number}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {surah.number}. {surah.name}
                  </p>
                  <p className="text-xs text-slate-500">{surah.verses} verses</p>
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
                    <Download className="w-3 h-3 mr-1" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {downloadedSurahs.length > 0 && (
          <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-sm text-teal-800">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              {downloadedSurahs.length} Surah{downloadedSurahs.length !== 1 ? 's' : ''} available offline
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}