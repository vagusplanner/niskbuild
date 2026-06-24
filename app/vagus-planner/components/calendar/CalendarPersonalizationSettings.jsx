import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Palette, Clock, Bell, Grid, Plus, Trash2, Save, X, 
  Calendar, Briefcase, Heart, Users, Moon, Home, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ColorPicker from './ColorPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ICON_OPTIONS = [
  { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'Heart', label: 'Heart', icon: Heart },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Moon', label: 'Moon', icon: Moon },
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'Calendar', label: 'Calendar', icon: Calendar }
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPersonalizationSettings({ onClose }) {
  const queryClient = useQueryClient();

  const { data: settingsData = [], isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const settings = settingsData[0] || {};

  const [localSettings, setLocalSettings] = useState({
    default_calendar_view: settings.default_calendar_view || 'month',
    working_hours_enabled: settings.working_hours_enabled || false,
    working_hours_start: settings.working_hours_start || '09:00',
    working_hours_end: settings.working_hours_end || '17:00',
    working_days: settings.working_days || [1, 2, 3, 4, 5],
    custom_event_categories: settings.custom_event_categories || [],
    notification_preferences_by_category: settings.notification_preferences_by_category || {}
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3b82f6',
    icon: 'Calendar',
    default_duration_minutes: 60,
    notification_defaults: [30]
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (settingsData.length === 0) {
        return base44.entities.UserSettings.create(data);
      }
      return base44.entities.UserSettings.update(settingsData[0].id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Settings saved successfully');
      onClose?.();
    },
    onError: (error) => {
      toast.error('Failed to save settings');
      console.error(error);
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(localSettings);
  };

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setLocalSettings(prev => ({
      ...prev,
      custom_event_categories: [...prev.custom_event_categories, { ...newCategory }]
    }));

    setNewCategory({
      name: '',
      color: '#3b82f6',
      icon: 'Calendar',
      default_duration_minutes: 60,
      notification_defaults: [30]
    });

    toast.success('Category added');
  };

  const handleDeleteCategory = (index) => {
    setLocalSettings(prev => ({
      ...prev,
      custom_event_categories: prev.custom_event_categories.filter((_, i) => i !== index)
    }));
    toast.success('Category removed');
  };

  const toggleWorkingDay = (day) => {
    setLocalSettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day].sort()
    }));
  };

  const updateCategoryNotification = (category, field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      notification_preferences_by_category: {
        ...prev.notification_preferences_by_category,
        [category]: {
          ...prev.notification_preferences_by_category?.[category],
          [field]: value
        }
      }
    }));
  };

  const DEFAULT_CATEGORIES = ['work', 'personal', 'health', 'prayer', 'family', 'social'];

  if (isLoading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Calendar Personalization
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Customize your calendar experience
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="general">
                <Calendar className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="working-hours">
                <Clock className="w-4 h-4 mr-2" />
                Working Hours
              </TabsTrigger>
              <TabsTrigger value="categories">
                <Grid className="w-4 h-4 mr-2" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Default View</CardTitle>
                  <CardDescription>Choose your preferred calendar view</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localSettings.default_calendar_view}
                    onValueChange={(value) => setLocalSettings(prev => ({ ...prev, default_calendar_view: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month View</SelectItem>
                      <SelectItem value="week">Week View</SelectItem>
                      <SelectItem value="day">Day View</SelectItem>
                      <SelectItem value="agenda">Agenda View</SelectItem>
                      <SelectItem value="timeline">Timeline View</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Working Hours */}
            <TabsContent value="working-hours" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Working Hours</CardTitle>
                      <CardDescription>Set your typical work schedule</CardDescription>
                    </div>
                    <Switch
                      checked={localSettings.working_hours_enabled}
                      onCheckedChange={(checked) => setLocalSettings(prev => ({ ...prev, working_hours_enabled: checked }))}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={localSettings.working_hours_start}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, working_hours_start: e.target.value }))}
                        disabled={!localSettings.working_hours_enabled}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={localSettings.working_hours_end}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, working_hours_end: e.target.value }))}
                        disabled={!localSettings.working_hours_enabled}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Working Days</Label>
                    <div className="flex gap-2">
                      {WEEKDAY_NAMES.map((day, index) => (
                        <Button
                          key={index}
                          variant={localSettings.working_days.includes(index) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleWorkingDay(index)}
                          disabled={!localSettings.working_hours_enabled}
                          className={cn(
                            "flex-1",
                            localSettings.working_days.includes(index) && "bg-teal-600 hover:bg-teal-700"
                          )}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Categories */}
            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Event Categories</CardTitle>
                  <CardDescription>Create personalized categories for your events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add New Category */}
                  <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm">Add New Category</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Category name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <ColorPicker
                        value={newCategory.color}
                        onChange={(color) => setNewCategory(prev => ({ ...prev, color }))}
                        label="Color"
                      />
                      <Select
                        value={newCategory.icon}
                        onValueChange={(value) => setNewCategory(prev => ({ ...prev, icon: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Default duration (min)"
                        value={newCategory.default_duration_minutes}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, default_duration_minutes: parseInt(e.target.value) }))}
                      />
                    </div>
                    <Button onClick={handleAddCategory} className="w-full" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </div>

                  {/* Existing Categories */}
                  <div className="space-y-2">
                    {localSettings.custom_event_categories.map((category, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium flex-1">{category.name}</span>
                        <Badge variant="outline">{category.default_duration_minutes}min</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences by Category</CardTitle>
                  <CardDescription>Customize notifications for each event type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {DEFAULT_CATEGORIES.map((category) => {
                    const prefs = localSettings.notification_preferences_by_category?.[category] || {
                      enabled: true,
                      advance_minutes: [30],
                      sound: true
                    };

                    return (
                      <div key={category} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium capitalize">{category}</h4>
                          <Switch
                            checked={prefs.enabled}
                            onCheckedChange={(checked) => updateCategoryNotification(category, 'enabled', checked)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Notify Before (minutes)</Label>
                            <Input
                              type="text"
                              placeholder="e.g., 15, 30, 60"
                              value={prefs.advance_minutes?.join(', ') || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                                updateCategoryNotification(category, 'advance_minutes', values);
                              }}
                              disabled={!prefs.enabled}
                            />
                          </div>
                          <div className="space-y-2 flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Switch
                                checked={prefs.sound}
                                onCheckedChange={(checked) => updateCategoryNotification(category, 'sound', checked)}
                                disabled={!prefs.enabled}
                              />
                              <span className="text-sm">Sound</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateSettingsMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}