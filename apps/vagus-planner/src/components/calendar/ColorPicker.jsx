import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Blue', value: '#3b82f6', bg: 'bg-blue-500' },
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-500' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-500' },
  { name: 'Violet', value: '#8b5cf6', bg: 'bg-violet-500' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-500' },
  { name: 'Pink', value: '#ec4899', bg: 'bg-pink-500' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-500' },
  { name: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-500' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-500' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-500' },
  { name: 'Slate', value: '#64748b', bg: 'bg-slate-500' }
];

export default function ColorPicker({ 
  value = '#3b82f6', 
  onChange, 
  label = 'Color',
  compact = false 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedColor = PRESET_COLORS.find(c => c.value === value) || PRESET_COLORS[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <Button variant="outline" size="icon" className="relative">
            <Palette className="w-4 h-4" />
            <div 
              className={cn("absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white", selectedColor.bg)}
            />
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-start gap-2">
            <Palette className="w-4 h-4" />
            <span>{label}</span>
            <div className={cn("ml-auto w-6 h-6 rounded-md", selectedColor.bg)} />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Choose a color</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((color) => (
              <motion.button
                key={color.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onChange(color.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "relative w-full aspect-square rounded-lg transition-all",
                  color.bg,
                  value === color.value && "ring-2 ring-slate-900 ring-offset-2"
                )}
                title={color.name}
              >
                {value === color.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white drop-shadow-lg" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}