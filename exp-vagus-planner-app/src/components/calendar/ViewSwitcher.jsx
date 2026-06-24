import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, List, Clock, Grid3x3, LayoutGrid, BarChart3, Rows, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function ViewSwitcher({ currentView, onViewChange }) {
  const { t } = useTranslation();

  const VIEW_OPTIONS = [
    { value: 'month',     label: t('calendar.views.month'),    icon: Calendar },
    { value: 'week',      label: t('calendar.views.week'),     icon: Grid3x3 },
    { value: 'multiweek', label: t('toolbar.multiWeek'),       icon: LayoutGrid },
    { value: 'day',       label: t('calendar.views.day'),      icon: Clock },
    { value: '3day',      label: t('toolbar.threeDayView'),    icon: LayoutGrid },
    { value: 'agenda',    label: t('calendar.views.agenda'),   icon: List },
    { value: 'workload',  label: t('toolbar.workload'),        icon: BarChart3 },
    { value: 'unified',   label: t('toolbar.unified'),         icon: Layers },
  ];

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = currentView === option.value;
        
        return (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(option.value)}
            className={cn(
              "h-8 gap-2 transition-all",
              isActive 
                ? "bg-white shadow-sm text-emerald-700 hover:bg-white" 
                : "hover:bg-slate-200 text-slate-600"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}