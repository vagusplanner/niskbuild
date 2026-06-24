import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Palette, Check, Sparkles, Save, Type, Layout } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const THEMES = [
  {
    id: 'default',
    name: 'Ocean Breeze',
    preview: 'from-teal-500 to-cyan-600',
    colors: {
      primary: '#14b8a6',
      accent: '#06b6d4',
      background: '#f8fafc',
      card: '#ffffff'
    }
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    preview: 'from-orange-500 to-pink-600',
    colors: {
      primary: '#f97316',
      accent: '#ec4899',
      background: '#fef3f2',
      card: '#ffffff'
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    preview: 'from-green-600 to-emerald-600',
    colors: {
      primary: '#16a34a',
      accent: '#10b981',
      background: '#f0fdf4',
      card: '#ffffff'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender Dreams',
    preview: 'from-purple-500 to-indigo-600',
    colors: {
      primary: '#a855f7',
      accent: '#6366f1',
      background: '#faf5ff',
      card: '#ffffff'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    preview: 'from-blue-900 to-slate-800',
    colors: {
      primary: '#1e3a8a',
      accent: '#334155',
      background: '#f1f5f9',
      card: '#ffffff'
    }
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    preview: 'from-rose-500 to-red-600',
    colors: {
      primary: '#f43f5e',
      accent: '#dc2626',
      background: '#fff1f2',
      card: '#ffffff'
    }
  }
];

const FONTS = [
  { id: 'default', name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
  { id: 'inter', name: 'Inter (Clean)', value: 'Inter, sans-serif' },
  { id: 'roboto', name: 'Roboto (Modern)', value: 'Roboto, sans-serif' },
  { id: 'poppins', name: 'Poppins (Friendly)', value: 'Poppins, sans-serif' },
  { id: 'lora', name: 'Lora (Elegant)', value: 'Lora, serif' }
];

const DENSITIES = [
  { id: 'compact', name: 'Compact', spacing: '0.25rem', fontSize: '0.875rem' },
  { id: 'comfortable', name: 'Comfortable', spacing: '0.5rem', fontSize: '1rem' },
  { id: 'spacious', name: 'Spacious', spacing: '1rem', fontSize: '1.125rem' }
];

export default function CalendarThemeCustomizer() {
  const [open, setOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedFont, setSelectedFont] = useState('default');
  const [selectedDensity, setSelectedDensity] = useState('comfortable');
  const [customThemes, setCustomThemes] = useState([]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  useEffect(() => {
    if (settings?.[0]) {
      if (settings[0].calendar_theme) {
        setSelectedTheme(settings[0].calendar_theme);
        applyThemeToDOM(settings[0].calendar_theme);
      }
      if (settings[0].calendar_font) {
        setSelectedFont(settings[0].calendar_font);
        applyFontToDOM(settings[0].calendar_font);
      }
      if (settings[0].calendar_density) {
        setSelectedDensity(settings[0].calendar_density);
        applyDensityToDOM(settings[0].calendar_density);
      }
      if (settings[0].custom_calendar_themes) {
        setCustomThemes(settings[0].custom_calendar_themes || []);
      }
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      const settingsId = settings?.[0]?.id;
      if (settingsId) {
        return base44.entities.UserSettings.update(settingsId, data);
      }
      return base44.entities.UserSettings.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userSettings']);
    }
  });

  const applyThemeToDOM = (themeId) => {
    const allThemes = [...THEMES, ...customThemes];
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--calendar-${key}`, value);
    });
  };

  const applyFontToDOM = (fontId) => {
    const font = FONTS.find(f => f.id === fontId);
    if (!font) return;
    document.documentElement.style.setProperty('--calendar-font', font.value);
  };

  const applyDensityToDOM = (densityId) => {
    const density = DENSITIES.find(d => d.id === densityId);
    if (!density) return;
    document.documentElement.style.setProperty('--calendar-spacing', density.spacing);
    document.documentElement.style.setProperty('--calendar-font-size', density.fontSize);
  };

  const handleThemeChange = async (themeId) => {
    setSelectedTheme(themeId);
    applyThemeToDOM(themeId);
    
    await updateSettingsMutation.mutateAsync({
      calendar_theme: themeId
    });
    
    toast.success('Theme updated!');
  };

  const handleFontChange = async (fontId) => {
    setSelectedFont(fontId);
    applyFontToDOM(fontId);
    
    await updateSettingsMutation.mutateAsync({
      calendar_font: fontId
    });
    
    toast.success('Font updated!');
  };

  const handleDensityChange = async (densityId) => {
    setSelectedDensity(densityId);
    applyDensityToDOM(densityId);
    
    await updateSettingsMutation.mutateAsync({
      calendar_density: densityId
    });
    
    toast.success('Layout density updated!');
  };

  const handleSaveCustomTheme = async () => {
    const themeName = prompt('Enter a name for your custom theme:');
    if (!themeName) return;

    const newTheme = {
      id: `custom-${Date.now()}`,
      name: themeName,
      preview: THEMES.find(t => t.id === selectedTheme)?.preview || 'from-teal-500 to-cyan-600',
      colors: THEMES.find(t => t.id === selectedTheme)?.colors || THEMES[0].colors,
      custom: true
    };

    const updatedCustomThemes = [...customThemes, newTheme];
    setCustomThemes(updatedCustomThemes);

    await updateSettingsMutation.mutateAsync({
      custom_calendar_themes: updatedCustomThemes
    });

    toast.success('Custom theme saved!');
  };

  const handleAISuggestTheme = async () => {
    setAiSuggesting(true);
    try {
      const { data } = await base44.functions.invoke('suggestCalendarTheme', {
        user_preferences: {
          font: selectedFont,
          density: selectedDensity,
          current_theme: selectedTheme
        }
      });

      if (data.suggested_theme) {
        toast.success(data.message || 'AI suggested a theme for you!');
        if (data.suggested_theme_id) {
          handleThemeChange(data.suggested_theme_id);
        }
      }
    } catch (error) {
      toast.error('Could not generate AI suggestion');
    } finally {
      setAiSuggesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-teal-600" />
            Calendar Theme Customizer
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colors">
              <Palette className="w-4 h-4 mr-2" />
              Colors
            </TabsTrigger>
            <TabsTrigger value="fonts">
              <Type className="w-4 h-4 mr-2" />
              Fonts
            </TabsTrigger>
            <TabsTrigger value="density">
              <Layout className="w-4 h-4 mr-2" />
              Density
            </TabsTrigger>
            <TabsTrigger value="custom">
              <Save className="w-4 h-4 mr-2" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-3 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Choose a color palette</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAISuggestTheme}
                disabled={aiSuggesting}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {aiSuggesting ? 'Suggesting...' : 'AI Suggest'}
              </Button>
            </div>
            
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`w-full p-4 border-2 rounded-xl transition-all hover:border-slate-300 ${
                  selectedTheme === theme.id 
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-950' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${theme.preview} shadow-lg`} />
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{theme.name}</h3>
                    <div className="flex gap-2 mt-2">
                      {Object.values(theme.colors).slice(0, 3).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {selectedTheme === theme.id && (
                    <Check className="w-6 h-6 text-teal-600" />
                  )}
                </div>
              </button>
            ))}

            {customThemes.length > 0 && (
              <>
                <div className="border-t border-slate-200 dark:border-slate-700 my-4" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your Custom Themes</h4>
                {customThemes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`w-full p-4 border-2 rounded-xl transition-all hover:border-slate-300 ${
                      selectedTheme === theme.id 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950' 
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${theme.preview} shadow-lg`} />
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{theme.name}</h3>
                        <p className="text-xs text-slate-500">Custom Theme</p>
                      </div>
                      {selectedTheme === theme.id && (
                        <Check className="w-6 h-6 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="fonts" className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                Font Family
              </Label>
              <div className="space-y-2">
                {FONTS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => handleFontChange(font.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedFont === font.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{font.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          The quick brown fox jumps over the lazy dog
                        </p>
                      </div>
                      {selectedFont === font.id && (
                        <Check className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="density" className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                Layout Density
              </Label>
              <div className="space-y-2">
                {DENSITIES.map(density => (
                  <button
                    key={density.id}
                    onClick={() => handleDensityChange(density.id)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedDensity === density.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{density.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {density.id === 'compact' && 'More events visible, less spacing'}
                          {density.id === 'comfortable' && 'Balanced view with good readability'}
                          {density.id === 'spacious' && 'More breathing room, easier on eyes'}
                        </p>
                      </div>
                      {selectedDensity === density.id && (
                        <Check className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 py-4">
            <div className="text-center py-8">
              <Save className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Save Custom Theme
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Choose your preferred color palette, font, and density, then save it as a custom theme.
              </p>
              <Button onClick={handleSaveCustomTheme} className="gap-2">
                <Save className="w-4 h-4" />
                Save Current Settings as Theme
              </Button>
              
              {customThemes.length > 0 && (
                <div className="mt-6 p-4 bg-teal-50 dark:bg-teal-950 rounded-lg">
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    You have {customThemes.length} custom theme{customThemes.length > 1 ? 's' : ''} saved
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}