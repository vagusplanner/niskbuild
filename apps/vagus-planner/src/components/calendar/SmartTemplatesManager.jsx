import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Calendar, Users, Moon, Coffee, Book, Phone, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_TEMPLATES = [
  {
    icon: Moon,
    label: 'Friday Jummah',
    color: 'from-emerald-500 to-teal-600',
    data: {
      title: 'Jummah Prayer',
      category: 'prayer',
      is_recurring: true,
      recurrence_type: 'weekly',
      recurrence_days: [5], // Friday
      duration_minutes: 60,
      notes: 'Friday congregational prayer'
    }
  },
  {
    icon: Users,
    label: 'Weekly Family Dinner',
    color: 'from-pink-500 to-rose-600',
    data: {
      title: 'Family Dinner',
      category: 'family',
      is_recurring: true,
      recurrence_type: 'weekly',
      recurrence_days: [5], // Friday
      duration_minutes: 120,
      notes: 'Weekly family gathering'
    }
  },
  {
    icon: Phone,
    label: 'Client Call',
    color: 'from-blue-500 to-cyan-600',
    data: {
      title: 'Client Call',
      category: 'work',
      duration_minutes: 30,
      notes: 'Client discussion'
    }
  },
  {
    icon: Book,
    label: 'Daily Quran Reading',
    color: 'from-purple-500 to-indigo-600',
    data: {
      title: 'Quran Reading',
      category: 'prayer',
      is_recurring: true,
      recurrence_type: 'daily',
      duration_minutes: 30,
      notes: 'Daily Quran recitation and reflection'
    }
  },
  {
    icon: Coffee,
    label: 'Morning Routine',
    color: 'from-amber-500 to-orange-600',
    data: {
      title: 'Morning Routine',
      category: 'personal',
      is_recurring: true,
      recurrence_type: 'daily',
      duration_minutes: 45,
      notes: 'Morning prayer, exercise, breakfast'
    }
  },
  {
    icon: Calendar,
    label: 'Weekly Planning',
    color: 'from-slate-500 to-gray-600',
    data: {
      title: 'Weekly Planning Session',
      category: 'work',
      is_recurring: true,
      recurrence_type: 'weekly',
      recurrence_days: [0], // Sunday
      duration_minutes: 60,
      notes: 'Plan the week ahead'
    }
  }
];

export default function SmartTemplatesManager({ onTemplateApplied }) {
  const [creating, setCreating] = useState(null);
  const queryClient = useQueryClient();

  const createFromTemplate = async (template) => {
    setCreating(template.label);
    try {
      // Get prayer-aware time suggestion
      const { data: suggestion } = await base44.functions.invoke('suggestPrayerAwareTime', {
        event_data: template.data
      });

      const eventData = {
        ...template.data,
        start_date: suggestion.suggested_start || new Date().toISOString(),
        end_date: suggestion.suggested_end || new Date(Date.now() + template.data.duration_minutes * 60000).toISOString()
      };

      await base44.entities.Event.create(eventData);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${template.label} scheduled!`);
      onTemplateApplied?.();
    } catch (error) {
      toast.error('Failed to create event');
    } finally {
      setCreating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Quick Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {DEFAULT_TEMPLATES.map((template, idx) => {
          const Icon = template.icon;
          const isCreating = creating === template.label;
          
          return (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => createFromTemplate(template)}
              disabled={isCreating}
              className={`p-4 rounded-xl bg-gradient-to-br ${template.color} text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
            >
              <Icon className="w-8 h-8 mb-2 mx-auto" />
              <p className="text-sm font-medium">{template.label}</p>
              {template.data.is_recurring && (
                <Badge className="mt-2 bg-white/20 text-white text-xs">
                  Recurring
                </Badge>
              )}
            </motion.button>
          );
        })}
      </CardContent>
    </Card>
  );
}