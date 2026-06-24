import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function CalendarEventFilter({ filters, onFilterChange }) {
  const categories = ['work', 'personal', 'health', 'prayer', 'holiday', 'family', 'social', 'other'];
  const sources = [
    { id: 'app', label: 'App Events', icon: '📱' },
    { id: 'google', label: 'Google Calendar', icon: '🔵' },
    { id: 'outlook', label: 'Outlook Calendar', icon: '📧' }
  ];

  const toggleFilter = (type, value) => {
    const key = type === 'source' ? 'sources' : 'categories';
    onFilterChange({
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter(f => f !== value)
        : [...filters[key], value]
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="font-semibold mb-3 block">Categories</Label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map(cat => (
              <motion.div key={cat} whileHover={{ x: 2 }} className="flex items-center gap-2">
                <Checkbox
                  checked={filters.categories.includes(cat)}
                  onCheckedChange={() => toggleFilter('category', cat)}
                  id={`cat-${cat}`}
                />
                <Label htmlFor={`cat-${cat}`} className="capitalize text-sm cursor-pointer">
                  {cat}
                </Label>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="font-semibold mb-3 block">Calendar Sources</Label>
          <div className="space-y-2">
            {sources.map(source => (
              <motion.div key={source.id} whileHover={{ x: 2 }} className="flex items-center gap-2">
                <Checkbox
                  checked={filters.sources.includes(source.id)}
                  onCheckedChange={() => toggleFilter('source', source.id)}
                  id={`src-${source.id}`}
                />
                <Label htmlFor={`src-${source.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                  <span>{source.icon}</span>
                  {source.label}
                </Label>
              </motion.div>
            ))}
          </div>
        </div>

        {(filters.categories.length > 0 || filters.sources.length > 0) && (
          <div className="border-t pt-4">
            <button
              onClick={() => onFilterChange({ categories: categories, sources: ['app', 'google', 'outlook'] })}
              className="text-sm text-blue-600 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}