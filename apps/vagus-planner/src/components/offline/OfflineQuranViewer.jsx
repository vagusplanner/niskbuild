import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { offlineStorage } from './offlineStorage';
import { Download, BookOpen, CheckCircle2, Search, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SURAHS } from '@/components/quran/QURAN_DATA';
import { fetchSurah } from '@/lib/quran-api';

/**
 * Offline Quran downloads — all 114 surahs from Al-Quran Cloud (real text),
 * cached in IndexedDB. Replaces the old 8-surah LLM stub list.
 */
export default function OfflineQuranViewer({ embedded = false }) {
  const [downloadedSurahs, setDownloadedSurahs] = useState([]);
  const [verseCounts, setVerseCounts] = useState({});
  const [downloading, setDownloading] = useState(null);
  const [query, setQuery] = useState('');
  const [viewing, setViewing] = useState(null); // surah number
  const [viewVerses, setViewVerses] = useState([]);

  useEffect(() => {
    loadDownloadedSurahs();
  }, []);

  const loadDownloadedSurahs = async () => {
    try {
      await offlineStorage.init();
      const allVerses = await offlineStorage.getAll('quranVerses');
      const counts = {};
      allVerses.forEach((v) => {
        const n = Number(v.surah_number);
        counts[n] = (counts[n] || 0) + 1;
      });
      setVerseCounts(counts);
      setDownloadedSurahs(Object.keys(counts).map(Number).sort((a, b) => a - b));
    } catch (error) {
      console.error('Failed to load downloaded surahs:', error);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter(
      (s) =>
        String(s.number).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.english || '').toLowerCase().includes(q)
    );
  }, [query]);

  const downloadSurah = async (surah) => {
    setDownloading(surah.number);
    try {
      const data = await fetchSurah(surah.number, 'en.asad');
      const verses = data.ayahs.map((a) => ({
        id: `${surah.number}-${a.numberInSurah}`,
        surah_number: surah.number,
        surah_name: data.englishName || surah.name,
        verse_number: a.numberInSurah,
        arabic_text: a.arabic,
        translation: a.translation,
        transliteration: '',
        global_number: a.globalNumber,
      }));

      // Replace any prior partial download for this surah
      const existing = await offlineStorage.getQuranBySurah(surah.number);
      for (const old of existing) {
        await offlineStorage.delete('quranVerses', old.id);
      }

      await offlineStorage.cacheQuranVerses(verses);
      await loadDownloadedSurahs();
      toast.success(`Surah ${surah.name}: ${verses.length} ayahs saved offline`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download Surah — check your connection');
    } finally {
      setDownloading(null);
    }
  };

  const removeSurah = async (surahNumber) => {
    try {
      const existing = await offlineStorage.getQuranBySurah(surahNumber);
      for (const v of existing) {
        await offlineStorage.delete('quranVerses', v.id);
      }
      if (viewing === surahNumber) {
        setViewing(null);
        setViewVerses([]);
      }
      await loadDownloadedSurahs();
      toast.success('Removed from offline storage');
    } catch {
      toast.error('Could not remove offline surah');
    }
  };

  const openSurah = async (surahNumber) => {
    const verses = await offlineStorage.getQuranBySurah(surahNumber);
    verses.sort((a, b) => a.verse_number - b.verse_number);
    setViewVerses(verses);
    setViewing(surahNumber);
  };

  const body = (
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Download any of the <strong>114 surahs</strong> (full Arabic + English from Al-Quran Cloud) for offline reading on this device.
          Large surahs like Al-Baqarah take longer and use more storage.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surah by name or number…"
            className="pl-9"
          />
        </div>

        {downloadedSurahs.length > 0 && (
          <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
            <p className="text-sm text-teal-800 dark:text-teal-200">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              {downloadedSurahs.length} of 114 surah{downloadedSurahs.length !== 1 ? 's' : ''} available offline
            </p>
          </div>
        )}

        {viewing != null && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto p-3 space-y-3 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 pb-2">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Offline preview · Surah {viewing}
              </p>
              <Button size="sm" variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
            {viewVerses.map((v) => (
              <div key={v.id} className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <p className="text-[10px] font-bold text-teal-700">{v.verse_number}</p>
                <p className="text-right text-lg leading-loose" dir="rtl" lang="ar">{v.arabic_text}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{v.translation}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2 max-h-80 overflow-y-auto pr-1">
          {filtered.map((surah) => {
            const isDownloaded = downloadedSurahs.includes(surah.number);
            const isDownloading = downloading === surah.number;
            const cachedCount = verseCounts[surah.number];
            const complete = isDownloaded && cachedCount >= surah.verses;

            return (
              <div
                key={surah.number}
                className="flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                    {surah.number}. {surah.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {surah.verses} ayahs
                    {isDownloaded && (
                      <span className="ml-1 text-teal-700">
                        · cached {cachedCount}/{surah.verses}
                        {!complete ? ' (incomplete — re-download)' : ''}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isDownloaded && (
                    <>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openSurah(surah.number)}>
                        Read
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600" onClick={() => removeSurah(surah.number)} aria-label="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {complete ? (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Offline
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => downloadSurah(surah)}
                      disabled={isDownloading || downloading != null}
                      className="bg-teal-600 hover:bg-teal-700 h-8"
                    >
                      {isDownloading ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" />…</>
                      ) : (
                        <><Download className="w-3 h-3 mr-1" />{isDownloaded ? 'Retry' : 'Download'}</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-600" />
          Offline downloads
        </h3>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" />
          Offline Quran Access
        </CardTitle>
      </CardHeader>
      <CardContent>
        {body}
      </CardContent>
    </Card>
  );
}
