import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Palette, Eye, Layout, Sparkles, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const COLOR_THEMES = {
  modern: {
    name: 'Modern',
    primary: 'from-teal-500 to-cyan-600',
    accent: 'from-purple-500 to-pink-500',
    work: 'bg-blue-100 text-blue-700 border-blue-300',
    personal: 'bg-purple-100 text-purple-700 border-purple-300',
    health: 'bg-green-100 text-green-700 border-green-300',
    prayer: 'bg-amber-100 text-amber-700 border-amber-300'
  },
  ocean: {
    name: 'Ocean',
    primary: 'from-blue-500 to-indigo-600',
    accent: 'from-cyan-400 to-blue-500',
    work: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    personal: 'bg-blue-100 text-blue-700 border-blue-300',
    health: 'bg-teal-100 text-teal-700 border-teal-300',
    prayer: 'bg-cyan-100 text-cyan-700 border-cyan-300'
  },
  sunset: {
    name: 'Sunset',
    primary: 'from-orange-500 to-red-600',
    accent: 'from-pink-400 to-rose-500',
    work: 'bg-orange-100 text-orange-700 border-orange-300',
    personal: 'bg-rose-100 text-rose-700 border-rose-300',
    health: 'bg-red-100 text-red-700 border-red-300',
    prayer: 'bg-amber-100 text-amber-700 border-amber-300'
  },
  forest: {
    name: 'Forest',
    primary: 'from-green-500 to-emerald-600',
    accent: 'from-lime-400 to-green-500',
    work: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    personal: 'bg-green-100 text-green-700 border-green-300',
    health: 'bg-lime-100 text-lime-700 border-lime-300',
    prayer: 'bg-teal-100 text-teal-700 border-teal-300'
  },
  lavender: {
    name: 'Lavender',
    primary: 'from-purple-500 to-violet-600',
    accent: 'from-fuchsia-400 to-purple-500',
    work: 'bg-violet-100 text-violet-700 border-violet-300',
    personal: 'bg-purple-100 text-purple-700 border-purple-300',
    health: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
    prayer: 'bg-indigo-100 text-indigo-700 border-indigo-300'
  }
};

const LAYOUT_PRESETS = {
  compact: {
    name: 'Compact',
    description: 'Maximum events visible, minimal spacing',
    dayHeight: 'h-24',
    eventSize: 'text-xs',
    padding: 'p-1'
  },
  comfortable: {
    name: 'Comfortable',
    description: 'Balanced spacing and readability',
    dayHeight: 'h-32',
    eventSize: 'text-sm',
    padding: 'p-2'
  },
  spacious: {
    name: 'Spacious',
    description: 'Maximum readability, generous spacing',
    dayHeight: 'h-40',
    eventSize: 'text-base',
    padding: 'p-3'
  }
};

export default function CalendarDisplaySettings({ isOpen, onClose, onApply }) {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('calendar_display_settings');
    return saved ? JSON.parse(saved) : {
      theme: 'modern',
      layout: 'comfortable',
      showEventTime: true,
      showEventLocation: true,
      showEventCategory: true,
      showEventDescription: false,
      showEventPriority: true,
      showWeekNumbers: false,
      highlightToday: true,
      highlightWeekends: true,
      showPastEvents: true,
      compactWeekends: false,
      eventTruncation: 2
    };
  });

  const handleSave = () => {
    localStorage.setItem('calendar_display_settings', JSON.stringify(settings));
    onApply(settings);
    toast.success('Display settings saved');
    onClose();
  };

  const handleReset = () => {
    const defaults = {
      theme: 'modern',
      layout: 'comfortable',
      showEventTime: true,
      showEventLocation: true,
      showEventCategory: true,
      showEventDescription: false,
      showEventPriority: true,
      showWeekNumbers: false,
      highlightToday: true,
      highlightWeekends: true,
      showPastEvents: true,
      compactWeekends: false,
      eventTruncation: 2
    };
    setSettings(defaults);
    toast.success('Reset to defaults');
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl z-[101] max-h-[90vh] overflow-hidden"
      >
        <Card className="h-full flex flex-col shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Calendar Display Settings
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="theme" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="theme">
                  <Palette className="w-4 h-4 mr-2" />
                  Theme
                </TabsTrigger>
                <TabsTrigger value="layout">
                  <Layout className="w-4 h-4 mr-2" />
                  Layout
                </TabsTrigger>
                <TabsTrigger value="details">
                  <Eye className="w-4 h-4 mr-2" />
                  Details
                </TabsTrigger>
              </TabsList>

              {/* Theme Tab */}
              <TabsContent value="theme" className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Choose Color Theme</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSettings({ ...settings, theme: key })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.theme === key
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className={`h-3 w-full rounded-full bg-gradient-to-r ${theme.primary} mb-2`} />
                        <div className={`h-2 w-3/4 rounded-full bg-gradient-to-r ${theme.accent} mb-3`} />
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          {theme.name}
                        </div>
                        {settings.theme === key && (
                          <Badge className="mt-2 bg-purple-600 text-white">
                            <Check className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Theme Preview */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
                    Preview
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {['work', 'personal', 'health', 'prayer'].map(cat => (
                      <Badge key={cat} className={COLOR_THEMES[settings.theme][cat]}>
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-3 block">Layout Density</Label>
                  <div className="space-y-3">
                    {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSettings({ ...settings, layout: key })}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          settings.layout === key
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {preset.name}
                          </span>
                          {settings.layout === key && (
                            <Check className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {preset.description}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Additional Options</Label>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Show Week Numbers</Label>
                      <p className="text-xs text-slate-500">Display week numbers in month view</p>
                    </div>
                    <Switch
                      checked={settings.showWeekNumbers}
                      onCheckedChange={(checked) => setSettings({ ...settings, showWeekNumbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Compact Weekends</Label>
                      <p className="text-xs text-slate-500">Reduce weekend column width</p>
                    </div>
                    <Switch
                      checked={settings.compactWeekends}
                      onCheckedChange={(checked) => setSettings({ ...settings, compactWeekends: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Highlight Today</Label>
                      <p className="text-xs text-slate-500">Emphasize current day</p>
                    </div>
                    <Switch
                      checked={settings.highlightToday}
                      onCheckedChange={(checked) => setSettings({ ...settings, highlightToday: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Highlight Weekends</Label>
                      <p className="text-xs text-slate-500">Different background for Sat/Sun</p>
                    </div>
                    <Switch
                      checked={settings.highlightWeekends}
                      onCheckedChange={(checked) => setSettings({ ...settings, highlightWeekends: checked })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Event Information Display</Label>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Event Time</Label>
                      <p className="text-xs text-slate-500">Show start/end times</p>
                    </div>
                    <Switch
                      checked={settings.showEventTime}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEventTime: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Location</Label>
                      <p className="text-xs text-slate-500">Display event location</p>
                    </div>
                    <Switch
                      checked={settings.showEventLocation}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEventLocation: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Category Badge</Label>
                      <p className="text-xs text-slate-500">Show event category</p>
                    </div>
                    <Switch
                      checked={settings.showEventCategory}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEventCategory: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Priority Indicator</Label>
                      <p className="text-xs text-slate-500">Show priority level</p>
                    </div>
                    <Switch
                      checked={settings.showEventPriority}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEventPriority: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Description Preview</Label>
                      <p className="text-xs text-slate-500">Show truncated description</p>
                    </div>
                    <Switch
                      checked={settings.showEventDescription}
                      onCheckedChange={(checked) => setSettings({ ...settings, showEventDescription: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div>
                      <Label className="text-sm">Past Events</Label>
                      <p className="text-xs text-slate-500">Display events that have passed</p>
                    </div>
                    <Switch
                      checked={settings.showPastEvents}
                      onCheckedChange={(checked) => setSettings({ ...settings, showPastEvents: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Event Truncation</Label>
                  <Select 
                    value={String(settings.eventTruncation)} 
                    onValueChange={(value) => setSettings({ ...settings, eventTruncation: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Show 1 event per day (+ more)</SelectItem>
                      <SelectItem value="2">Show 2 events per day (+ more)</SelectItem>
                      <SelectItem value="3">Show 3 events per day (+ more)</SelectItem>
                      <SelectItem value="999">Show all events</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Controls how many events are visible before showing "+X more"
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply Settings
            </Button>
          </div>
        </Card>
      </motion.div>
    </>
  );
}