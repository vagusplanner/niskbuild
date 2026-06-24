import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, 
  BookOpen, 
  Heart, 
  Trash2, 
  Loader2,
  Globe,
  Volume2,
  Clock,
  Star,
  Book,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TRANSLATIONS, RECITERS } from './quranData';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function IslamicProfile() {
  const queryClient = useQueryClient();
  const [savingSettings, setSavingSettings] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch user settings
  const { data: userSettings = [] } = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const settings = userSettings[0] || {};

  // Fetch saved Hadiths
  const { data: savedHadiths = [] } = useQuery({
    queryKey: ['user-hadiths'],
    queryFn: () => base44.entities.Hadith.list('-created_date', 100)
  });

  // Fetch Quran bookmarks
  const { data: quranBookmarks = [] } = useQuery({
    queryKey: ['quran-bookmarks'],
    queryFn: () => base44.entities.QuranVerse.filter({ is_favorite: true }, '-created_date', 100)
  });

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return base44.entities.UserSettings.update(settings.id, data);
      } else {
        return base44.entities.UserSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-settings']);
      toast.success('Settings updated!');
    }
  });

  const deleteHadithMutation = useMutation({
    mutationFn: (id) => base44.entities.Hadith.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-hadiths']);
      toast.success('Hadith removed');
    }
  });

  const deleteQuranBookmarkMutation = useMutation({
    mutationFn: (id) => base44.entities.QuranVerse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quran-bookmarks']);
      toast.success('Bookmark removed');
    }
  });

  const toggleHadithFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.Hadith.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-hadiths']);
    }
  });

  const handleUpdateSettings = async (field, value) => {
    setSavingSettings(true);
    try {
      await updateSettingsMutation.mutateAsync({ [field]: value });
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteUserAccount', {});
      toast.success('Account deleted successfully');
      setTimeout(() => {
        base44.auth.logout();
      }, 1000);
    } catch (error) {
      toast.error('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Islamic Profile</h1>
          <p className="text-slate-600">Manage your preferences and bookmarks</p>
        </div>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="hadiths">
            Saved Hadiths ({savedHadiths.length})
          </TabsTrigger>
          <TabsTrigger value="quran">
            Quran Bookmarks ({quranBookmarks.length})
          </TabsTrigger>
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card className="border-teal-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-900">
                <Globe className="w-5 h-5" />
                Translation Preferences
              </CardTitle>
              <CardDescription>
                Choose your preferred Quran translation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.quran_translation || 'sahih'}
                onValueChange={(val) => handleUpdateSettings('quran_translation', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select translation" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATIONS.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Volume2 className="w-5 h-5" />
                Reciter Preferences
              </CardTitle>
              <CardDescription>
                Choose your preferred Quran reciter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.quran_reciter || 'alafasy'}
                onValueChange={(val) => handleUpdateSettings('quran_reciter', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reciter" />
                </SelectTrigger>
                <SelectContent>
                  {RECITERS.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Clock className="w-5 h-5" />
                Timezone & Calendar
              </CardTitle>
              <CardDescription>
                Configure timezone for prayer times and Islamic calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Timezone
                </label>
                <Select
                  value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  onValueChange={(val) => handleUpdateSettings('timezone', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                    <SelectItem value="Asia/Riyadh">Riyadh</SelectItem>
                    <SelectItem value="Asia/Karachi">Karachi</SelectItem>
                    <SelectItem value="Asia/Jakarta">Jakarta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {savingSettings && (
            <div className="flex items-center gap-2 text-sm text-teal-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </div>
          )}

          {/* Danger Zone */}
          <Card className="border-red-300 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </CardTitle>
              <CardDescription className="text-red-700">
                Irreversible actions that affect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-white rounded-lg border border-red-200">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Delete Account</h3>
                    <p className="text-sm text-slate-600">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Hadiths Tab */}
        <TabsContent value="hadiths">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {savedHadiths.length === 0 ? (
                <Card className="border-amber-200">
                  <CardContent className="p-12 text-center">
                    <Book className="w-12 h-12 mx-auto mb-3 text-amber-300" />
                    <p className="text-slate-600">No saved Hadiths yet</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Use the Hadith Reader to save your favorite Hadiths
                    </p>
                  </CardContent>
                </Card>
              ) : (
                savedHadiths.map((hadith) => (
                  <motion.div
                    key={hadith.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-amber-200 hover:shadow-md transition-shadow">
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
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-slate-600">
                            <span className="font-medium">{hadith.narrator}</span>
                            {' • '}
                            {hadith.source}
                            {hadith.reference && ` - ${hadith.reference}`}
                          </div>
                          <Badge className="bg-amber-100 text-amber-800">
                            {hadith.category}
                          </Badge>
                        </div>

                        {hadith.notes && (
                          <div className="p-2 bg-slate-50 rounded text-sm text-slate-600 mb-3">
                            <strong>Notes:</strong> {hadith.notes}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleHadithFavoriteMutation.mutate({
                              id: hadith.id,
                              isFavorite: hadith.is_favorite
                            })}
                            className="border-rose-300"
                          >
                            <Heart 
                              className={`w-4 h-4 ${hadith.is_favorite ? 'fill-rose-500 text-rose-500' : ''}`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Remove this Hadith from your collection?')) {
                                deleteHadithMutation.mutate(hadith.id);
                              }
                            }}
                            className="border-red-300 text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Quran Bookmarks Tab */}
        <TabsContent value="quran">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {quranBookmarks.length === 0 ? (
                <Card className="border-teal-200">
                  <CardContent className="p-12 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-teal-300" />
                    <p className="text-slate-600">No Quran bookmarks yet</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Use the Quran Reader to bookmark your favorite verses
                    </p>
                  </CardContent>
                </Card>
              ) : (
                quranBookmarks.map((bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-teal-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-teal-600">
                            {bookmark.surah_number}:{bookmark.verse_number}
                          </Badge>
                          <span className="text-sm text-teal-600 font-medium">
                            {bookmark.surah_name}
                          </span>
                        </div>

                        {bookmark.arabic_text && (
                          <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg mb-3">
                            <p className="text-right text-xl leading-loose font-arabic text-teal-900" dir="rtl">
                              {bookmark.arabic_text}
                            </p>
                          </div>
                        )}

                        {bookmark.transliteration && (
                          <div className="p-2 bg-slate-50 rounded-lg mb-2">
                            <p className="text-slate-600 italic text-sm text-center">
                              {bookmark.transliteration}
                            </p>
                          </div>
                        )}

                        <p className="text-slate-700 leading-relaxed mb-3">
                          {bookmark.translation}
                        </p>

                        {bookmark.notes && (
                          <div className="p-2 bg-slate-50 rounded text-sm text-slate-600 mb-3">
                            <strong>Notes:</strong> {bookmark.notes}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Remove this bookmark?')) {
                                deleteQuranBookmarkMutation.mutate(bookmark.id);
                              }
                            }}
                            className="border-red-300 text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">This action cannot be undone. This will permanently:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Delete your account</li>
                <li>Remove all your Islamic bookmarks and saved content</li>
                <li>Delete your prayer logs and spiritual progress</li>
                <li>Remove all events, tasks, and calendar data</li>
                <li>Delete all personal settings and preferences</li>
              </ul>
              <p className="text-red-600 font-medium mt-3">
                You will be logged out immediately after deletion.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete My Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}