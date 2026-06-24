import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles, ChevronDown, ChevronUp, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ConflictNotificationBanner({ onResolveClick }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(new Set());

  const { data: activeConflicts = [] } = useQuery({
    queryKey: ['conflicts', 'active'],
    queryFn: () => base44.entities.ConflictResolution.filter({ status: 'active' }),
    refetchInterval: 60_000,
  });

  const visible = activeConflicts.filter(c => !dismissed.has(c.id));

  if (visible.length === 0) return null;

  const first = visible[0];
  const rest = visible.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="mb-3 rounded-xl overflow-hidden border border-orange-200 dark:border-orange-800 shadow-sm"
    >
      {/* Main banner row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50">
        <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-orange-900 dark:text-orange-100 truncate">
              {visible.length === 1
                ? 'Schedule conflict detected'
                : `${visible.length} schedule conflicts`}
            </span>
            <Badge variant="outline" className="text-[10px] border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 px-1.5 flex-shrink-0">
              {visible.length}
            </Badge>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-300 truncate mt-0.5">
            <span className="font-medium">{first.event1_title}</span>
            {' & '}
            <span className="font-medium">{first.event2_title}</span>
            {first.conflict_date && ` · ${format(new Date(first.conflict_date), 'MMM d')}`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => onResolveClick(first)}
            className="h-7 px-3 text-xs bg-orange-600 hover:bg-orange-700 gap-1.5"
          >
            <Sparkles className="w-3 h-3" />
            Fix with AI
          </Button>

          {rest.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900"
              onClick={() => setExpanded(p => !p)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-orange-400 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
            onClick={() => setDismissed(p => new Set([...p, first.id]))}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded additional conflicts */}
      <AnimatePresence>
        {expanded && rest.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-orange-100 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/30 overflow-hidden"
          >
            {rest.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 border-orange-100 dark:border-orange-900"
              >
                <Clock className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-300 flex-1 min-w-0 truncate">
                  <span className="font-medium">{conflict.event1_title}</span>
                  {' & '}
                  <span className="font-medium">{conflict.event2_title}</span>
                  {conflict.conflict_date && ` · ${format(new Date(conflict.conflict_date), 'MMM d')}`}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResolveClick(conflict)}
                    className="h-6 px-2 text-xs text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                  >
                    Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-orange-400"
                    onClick={() => setDismissed(p => new Set([...p, conflict.id]))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}