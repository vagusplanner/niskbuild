import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Clock, Check, Calendar, Copy } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { toast } from 'sonner';

export default function SwipeableEventCard({ event, onUpdate, onReschedule, onComplete }) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const leftBg = useTransform(x, [-150, 0], ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 0)']);
  const rightBg = useTransform(x, [0, 150], ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 0.8)']);
  const upBg = 'rgba(59, 130, 246, 0.8)';

  const handleDragEnd = (_, info) => {
    const threshold = 100;
    
    if (info.offset.x < -threshold) {
      // Swipe left = Complete
      completeEvent();
    } else if (info.offset.x > threshold) {
      // Swipe right = Reschedule
      rescheduleEvent();
    }
    
    setIsDragging(false);
  };

  const completeEvent = async () => {
    try {
      await SDK.entities.Event.update(event.id, {
        ...event,
        notes: (event.notes || '') + '\n[Completed via swipe]'
      });
      toast.success('Event marked as complete!');
      onComplete?.(event);
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  const rescheduleEvent = () => {
    onReschedule?.(event);
    toast.info('Opening reschedule options...');
  };

  const duplicateEvent = async () => {
    try {
      const newEvent = {
        ...event,
        id: undefined,
        created_date: undefined,
        updated_date: undefined,
        title: `${event.title} (Copy)`,
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 86400000 + 3600000).toISOString()
      };
      
      await SDK.entities.Event.create(newEvent);
      toast.success('Event duplicated!');
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to duplicate event');
    }
  };

  const categoryColors = {
    work: 'border-l-blue-500 bg-blue-50',
    personal: 'border-l-purple-500 bg-purple-50',
    family: 'border-l-pink-500 bg-pink-50',
    prayer: 'border-l-emerald-500 bg-emerald-50',
    health: 'border-l-green-500 bg-green-50'
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-8 pointer-events-none">
        <motion.div style={{ opacity: leftBg }} className="flex items-center gap-2 text-white">
          <Check className="w-6 h-6" />
          <span className="font-medium">Complete</span>
        </motion.div>
        <motion.div style={{ opacity: rightBg }} className="flex items-center gap-2 text-white">
          <span className="font-medium">Reschedule</span>
          <Calendar className="w-6 h-6" />
        </motion.div>
      </div>

      {/* Event Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10"
      >
        <Card className={`p-4 border-l-4 ${categoryColors[event.category] || 'border-l-slate-500 bg-slate-50'} cursor-grab active:cursor-grabbing`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">{event.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-600">
                  {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {event.category && (
                  <span className="text-xs text-slate-500 capitalize">• {event.category}</span>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">{event.description}</p>
              )}
            </div>
            <button
              onClick={duplicateEvent}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Duplicate event"
            >
              <Copy className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Tutorial hint on first render */}
      {!localStorage.getItem('swipe_tutorial_seen') && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute -bottom-8 left-0 right-0 text-center"
        >
          <p className="text-xs text-slate-500">← Swipe to complete • Swipe to reschedule →</p>
        </motion.div>
      )}
    </div>
  );
}