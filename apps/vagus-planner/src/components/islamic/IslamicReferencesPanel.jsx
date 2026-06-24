import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BookOpen, Save, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const QURAN_TRANSLATIONS = [
  {
    value: 'saheeh_international',
    label: 'Saheeh International',
    description: 'Clear modern English, widely used in Islamic education worldwide.',
    language: 'English',
    recommended: true,
  },
  {
    value: 'pickthall',
    label: 'Pickthall (The Meaning of the Glorious Quran)',
    description: 'Classical literary English by Muhammad Marmaduke Pickthall (1930).',
    language: 'English',
  },
  {
    value: 'yusuf_ali',
    label: 'Yusuf Ali',
    description: 'Eloquent English translation with extensive commentary by Abdullah Yusuf Ali.',
    language: 'English',
    recommended: true,
  },
  {
    value: 'dr_ghali',
    label: 'Dr. Ghali',
    description: 'Literal Arabic-to-English translation preserving the original structure.',
    language: 'English',
  },
  {
    value: 'hilali_khan',
    label: 'Hilali & Khan (The Noble Quran)',
    description: 'Translation by Dr. Muhammad Taqi-ud-Din Al-Hilali & Dr. Muhammad Muhsin Khan.',
    language: 'English',
  },
  {
    value: 'arberry',
    label: 'Arberry (The Koran Interpreted)',
    description: 'Scholarly translation by A. J. Arberry with literary quality.',
    language: 'English',
  },
];

const HADITH_COLLECTIONS = [
  {
    value: 'bukhari',
    label: 'Sahih al-Bukhari',
    description: 'Compiled by Imam Muhammad al-Bukhari (810–870 CE). Considered the most authentic hadith collection after the Quran.',
    grade: 'Sahih (Authentic)',
    color: 'emerald',
    recommended: true,
  },
  {
    value: 'muslim',
    label: 'Sahih Muslim',
    description: 'Compiled by Imam Muslim ibn al-Hajjaj (815–875 CE). Second most authentic hadith collection in Sunni Islam.',
    grade: 'Sahih (Authentic)',
    color: 'teal',
    recommended: true,
  },
  {
    value: 'tirmidhi',
    label: 'Jami at-Tirmidhi',
    description: 'Compiled by Imam at-Tirmidhi (824–892 CE). Known for its grading system and fiqh commentary.',
    grade: 'Hasan/Sahih',
    color: 'blue',
  },
  {
    value: 'abudawud',
    label: 'Sunan Abu Dawud',
    description: 'Compiled by Imam Abu Dawud (817–889 CE). Focuses on legal hadiths and Islamic jurisprudence.',
    grade: 'Hasan/Sahih',
    color: 'indigo',
  },
  {
    value: 'nasai',
    label: "Sunan an-Nasa'i",
    description: "Compiled by Imam an-Nasa'i (829–915 CE). Strict selection criteria with focus on prayer-related hadiths.",
    grade: 'Sahih',
    color: 'violet',
  },
  {
    value: 'ibnmajah',
    label: 'Sunan Ibn Majah',
    description: 'Compiled by Imam Ibn Majah (824–887 CE). Sixth of the Kutub al-Sittah (Six Canonical Books).',
    grade: 'Hasan/Sahih',
    color: 'purple',
  },
  {
    value: 'malik',
    label: 'Muwatta Imam Malik',
    description: 'Compiled by Imam Malik ibn Anas (711–795 CE). The oldest known hadith collection, focusing on Madinan practice.',
    grade: 'Sahih',
    color: 'amber',
  },
  {
    value: 'nawawi',
    label: "Imam Nawawi's 40 Hadith",
    description: "Imam an-Nawawi's (1233–1277 CE) renowned collection of 42 foundational hadiths covering core Islamic principles.",
    grade: 'Sahih/Hasan',
    color: 'rose',
    recommended: true,
  },
  {
    value: 'riyadhussalihin',
    label: 'Riyad as-Salihin',
    description: "Compiled by Imam an-Nawawi. A comprehensive collection of hadiths on Islamic manners and ethics.",
    grade: 'Sahih/Hasan',
    color: 'cyan',
  },
];

const PRAYER_CALC_METHODS = [
  {
    value: 'MWL',
    label: 'Muslim World League',
    description: 'Fajr: 18°, Isha: 17°. Used in Europe, Far East, and parts of the USA.',
    region: 'Europe / Far East',
  },
  {
    value: 'ISNA',
    label: 'Islamic Society of North America (ISNA)',
    description: 'Fajr: 15°, Isha: 15°. Standard for North America.',
    region: 'North America',
    recommended: true,
  },
  {
    value: 'Egypt',
    label: 'Egyptian General Authority of Survey',
    description: 'Fajr: 19.5°, Isha: 17.5°. Used in Africa, Syria, Lebanon, Malaysia.',
    region: 'Africa / Middle East',
  },
  {
    value: 'Makkah',
    label: 'Umm Al-Qura University, Makkah',
    description: 'Fajr: 18.5°, Isha: 90 min after Maghrib. Used in the Arabian Peninsula.',
    region: 'Arabian Peninsula',
    recommended: true,
  },
  {
    value: 'Karachi',
    label: 'University of Islamic Sciences, Karachi',
    description: 'Fajr: 18°, Isha: 18°. Used in Pakistan, Bangladesh, India, Afghanistan.',
    region: 'South / Central Asia',
  },
  {
    value: 'Tehran',
    label: 'Institute of Geophysics, Tehran',
    description: 'Fajr: 17.7°, Isha: 14°. Used in Iran and some Shia communities.',
    region: 'Iran',
  },
  {
    value: 'Jafari',
    label: 'Shia Ithna-Ashari (Jafari)',
    description: 'Fajr: 16°, Isha: 14°. Followed by Shia communities worldwide.',
    region: 'Shia communities',
  },
];

const GRADE_COLOR = {
  emerald: 'bg-emerald-100 text-emerald-800',
  teal: 'bg-teal-100 text-teal-800',
  blue: 'bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  violet: 'bg-violet-100 text-violet-800',
  purple: 'bg-purple-100 text-purple-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
  cyan: 'bg-cyan-100 text-cyan-800',
};

export default function IslamicReferencesPanel() {
  const queryClient = useQueryClient();

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const settings = settingsArr[0] || {};

  const [quranTranslation, setQuranTranslation] = useState(settings.quran_translation || 'saheeh_international');
  const [hadithCollections, setHadithCollections] = useState(
    settings.preferred_hadith_collections || ['bukhari', 'muslim', 'nawawi']
  );
  const [prayerMethod, setPrayerMethod] = useState(settings.prayer_method || 'MWL');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (settings?.id) return base44.entities.UserSettings.update(settings.id, data);
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Reference preferences saved');
    },
  });

  const toggleHadith = (value) => {
    setHadithCollections(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      quran_translation: quranTranslation,
      preferred_hadith_collections: hadithCollections,
      prayer_method: prayerMethod,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <Info className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Islamic References Used in Vagus Planner</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            All Quran verses, hadiths, duas, and prayer times shown in the app are sourced from established, 
            authenticated Islamic references. You can select which ones to prioritise below.
          </p>
        </div>
      </div>

      {/* Quran Translation */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Quran Translation
          </CardTitle>
          <CardDescription>Choose which translation to display alongside Arabic text</CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Active Translation</Label>
            <Select value={quranTranslation} onValueChange={setQuranTranslation}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QURAN_TRANSLATIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      {t.label}
                      {t.recommended && <span className="text-xs text-emerald-600 font-medium">(Recommended)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {QURAN_TRANSLATIONS.map(t => (
              <button
                key={t.value}
                onClick={() => setQuranTranslation(t.value)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  quranTranslation === t.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{t.label}</p>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {t.recommended && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Recommended</Badge>
                    )}
                    {quranTranslation === t.value && (
                      <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">Active</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hadith Collections */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Hadith Collections
          </CardTitle>
          <CardDescription>
            Select which collections to draw from for daily hadiths, reminders, and Islamic guidance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HADITH_COLLECTIONS.map(h => {
              const isSelected = hadithCollections.includes(h.value);
              return (
                <button
                  key={h.value}
                  onClick={() => toggleHadith(h.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{h.label}</p>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {h.recommended && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">Recommended</Badge>
                      )}
                      {isSelected && (
                        <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">Selected</Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${GRADE_COLOR[h.color]} text-[10px] px-1.5 py-0 mb-1`}>{h.grade}</Badge>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">{h.description}</p>
                </button>
              );
            })}
          </div>
          {hadithCollections.length === 0 && (
            <p className="text-xs text-amber-600 text-center mt-3 p-2 bg-amber-50 rounded-lg">
              Please select at least one hadith collection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Prayer Calculation Methods */}
      <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Prayer Time Calculation Method
          </CardTitle>
          <CardDescription>
            Different scholarly authorities use different solar angles — choose the one for your region
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRAYER_CALC_METHODS.map(m => (
              <button
                key={m.value}
                onClick={() => setPrayerMethod(m.value)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  prayerMethod === m.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{m.label}</p>
                  {m.recommended && (
                    <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 flex-shrink-0">Recommended</Badge>
                  )}
                </div>
                <Badge className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0 mb-1">{m.region}</Badge>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">{m.description}</p>
                {prayerMethod === m.value && (
                  <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0 mt-1.5">Active</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending || hadithCollections.length === 0}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Reference Preferences'}
      </Button>
    </div>
  );
}