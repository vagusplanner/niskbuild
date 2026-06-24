import React from 'react';
import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Tooltip({ 
  content, 
  children, 
  side = 'top',
  showIcon = true,
  iconType = 'help',
  className
}) {
  const Icon = iconType === 'info' ? Info : HelpCircle;

  return (
    <TooltipProvider delayDuration={200}>
      <TooltipPrimitive>
        <TooltipTrigger asChild>
          {children || (
            <button className={cn(
              "inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors",
              className
            )}>
              <Icon className="w-4 h-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="max-w-xs bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 border-slate-700 dark:border-slate-600"
        >
          <p className="text-sm leading-relaxed">{content}</p>
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  );
}