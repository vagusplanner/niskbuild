import React from 'react';
import { 
  Plus, 
  Sparkles, 
  Calendar as CalendarIcon,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function MobileQuickAccessBar({ 
  onNewEvent,
  onNaturalLanguage,
  onQuickJump,
  onWeather,
  onFilter
}) {
  return (
    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-40 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-around">
        <button
          onClick={onNewEvent}
          className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={onNaturalLanguage}
          className="p-3 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-violet-600" />
        </button>

        <button
          onClick={onQuickJump}
          className="p-3 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
        >
          <CalendarIcon className="w-5 h-5 text-teal-600" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-slate-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onWeather}>
              Weather Forecast
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFilter}>
              Filter Events
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>
              Calendar Sets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}