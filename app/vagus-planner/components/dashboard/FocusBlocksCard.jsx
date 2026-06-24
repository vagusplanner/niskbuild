import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Clock, Calendar, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const energyColors = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-orange-100 text-orange-700'
};

export default function FocusBlocksCard({ data, isLoading, expanded = false }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.success) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-700 text-center">Unable to suggest focus blocks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-green-600" />
            Smart Focus Blocks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* General Tips */}
          {data.general_tips?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Focus Tips
              </h4>
              <ul className="space-y-1">
                {data.general_tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-blue-700">• {tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Best Focus Days */}
          {data.best_focus_days?.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Best days:</span>
              <div className="flex gap-1">
                {data.best_focus_days.map((day, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-100 text-green-700">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Focus Blocks */}
          {data.focus_blocks?.length > 0 ? (
            <div className="space-y-3">
              {data.focus_blocks.slice(0, expanded ? undefined : 4).map((block, idx) => (
                <div key={idx} className="bg-white border-2 border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(block.date), 'MMM d')} • {block.start_time} - {block.end_time}
                        </p>
                        <p className="text-xs text-slate-500">{block.duration_hours}h focus block</p>
                      </div>
                    </div>
                    <Badge className={energyColors[block.energy_level]}>
                      {block.energy_level}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600">{block.reasoning}</p>

                  {block.recommended_tasks?.length > 0 && (
                    <div className="bg-green-50 rounded p-2">
                      <p className="text-xs font-medium text-green-900 mb-1">Recommended tasks:</p>
                      <ul className="space-y-0.5">
                        {block.recommended_tasks.map((task, tIdx) => (
                          <li key={tIdx} className="text-xs text-green-700">→ {task}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Zap className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No focus blocks available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}