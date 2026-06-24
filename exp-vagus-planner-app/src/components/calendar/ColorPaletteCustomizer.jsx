import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Palette, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_COLORS = {
  work: '#3B82F6',
  personal: '#8B5CF6',
  health: '#10B981',
  prayer: '#F59E0B',
  holiday: '#EF4444',
  family: '#EC4899',
  social: '#06B6D4',
  other: '#6B7280'
};

const PRESET_PALETTES = [
  {
    name: 'Default',
    colors: DEFAULT_COLORS
  },
  {
    name: 'Vibrant',
    colors: {
      work: '#FF6B6B',
      personal: '#4ECDC4',
      health: '#45B7D1',
      prayer: '#FFA07A',
      holiday: '#FFD93D',
      family: '#6BCB77',
      social: '#A8E6CF',
      other: '#818181'
    }
  },
  {
    name: 'Pastel',
    colors: {
      work: '#AED9E0',
      personal: '#D4A5D9',
      health: '#A8E6CF',
      prayer: '#FFD3B6',
      holiday: '#FFAAA5',
      family: '#FF8B94',
      social: '#A8D8EA',
      other: '#C7CEEA'
    }
  }
];

export default function ColorPaletteCustomizer({ settings }) {
  const [customColors, setCustomColors] = useState(settings?.custom_calendar_colors || DEFAULT_COLORS);
  const [selectedPalette, setSelectedPalette] = useState('Default');
  const queryClient = useQueryClient();

  const updateColorMutation = useMutation({
    mutationFn: (colors) => 
      SDK.auth.updateMe({ custom_calendar_colors: colors }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success('Calendar colors updated');
    }
  });

  const handleColorChange = (category, color) => {
    const updated = { ...customColors, [category]: color };
    setCustomColors(updated);
  };

  const applyPreset = (palette) => {
    setCustomColors(palette.colors);
    setSelectedPalette(palette.name);
    updateColorMutation.mutate(palette.colors);
  };

  const saveColors = () => {
    updateColorMutation.mutate(customColors);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          Event Category Colors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Palettes */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Quick Presets</p>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_PALETTES.map((palette) => (
              <motion.button
                key={palette.name}
                whileHover={{ scale: 1.05 }}
                onClick={() => applyPreset(palette)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${selectedPalette === palette.name 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <p className="text-sm font-medium text-slate-700 mb-2">{palette.name}</p>
                <div className="flex gap-1 flex-wrap">
                  {Object.values(palette.colors).slice(0, 4).map((color, idx) => (
                    <div
                      key={idx}
                      className="w-4 h-4 rounded-full border border-slate-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Customize Categories</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(customColors).map(([category, color]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <label className="flex-1 flex items-center gap-3 cursor-pointer">
                  <span className="text-sm font-medium text-slate-700 capitalize flex-1">
                    {category}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-slate-300 cursor-pointer hover:border-slate-400"
                      style={{ backgroundColor: color }}
                    />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleColorChange(category, e.target.value)}
                      className="w-0 h-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </label>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Preview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(customColors).map(([category, color]) => (
              <div
                key={category}
                className="p-3 rounded-lg text-white text-xs font-medium text-center"
                style={{ backgroundColor: color }}
              >
                {category}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <Button
            onClick={saveColors}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            Save Colors
          </Button>
          <Button
            onClick={() => setCustomColors(DEFAULT_COLORS)}
            variant="outline"
            className="flex-1"
          >
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}